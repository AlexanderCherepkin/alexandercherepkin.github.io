<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$conf = require __DIR__ . '/config.php';

// --- утилиты ---
function respond(int $code, array $data): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function ensure_dir(string $dir): void { if (!is_dir($dir)) @mkdir($dir, 0775, true); }
function clean(string $v): string { return trim(filter_var($v, FILTER_SANITIZE_STRING, FILTER_FLAG_NO_ENCODE_QUOTES)); }
function is_phone(string $v): bool { return (bool)preg_match('~^[0-9\-\+\(\)\s]{6,20}$~u', $v); }
function client_ip(): string {
  foreach (['HTTP_CF_CONNECTING_IP','HTTP_X_REAL_IP','HTTP_X_FORWARDED_FOR','REMOTE_ADDR'] as $k) {
    if (!empty($_SERVER[$k])) { $val = explode(',', $_SERVER[$k])[0]; return trim($val); }
  }
  return '0.0.0.0';
}

// --- метод ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  respond(405, ['ok'=>false,'error'=>'method_not_allowed']);
}

// --- входные данные ---
$name    = clean($_POST['name'] ?? '');
$phone   = clean($_POST['phone'] ?? '');
$message = trim((string)($_POST['message'] ?? ''));
$csrf    = (string)($_POST['csrf_seed'] ?? '');
$hp      = (string)($_POST['company'] ?? ''); // honeypot

// --- honeypot ---
if ($hp !== '') {
  // Притворяемся успехом, но ничего не делаем
  respond(200, ['ok'=>true,'status'=>'accepted']);
}

// --- CSRF (double-submit cookie) ---
$csrfCookie = $_COOKIE['csrf_seed'] ?? '';
if (!$csrf || !$csrfCookie || !hash_equals((string)$csrfCookie, (string)$csrf)) {
  respond(400, ['ok'=>false,'error'=>'invalid_csrf']);
}

// --- валидация ---
$errors = [];
if (mb_strlen($name) < 2 || mb_strlen($name) > 100)      $errors['name']='invalid';
if (!is_phone($phone))                                   $errors['phone']='invalid';
if (mb_strlen($message) > 2000)                          $errors['message']='too_long';
if ($errors) respond(422, ['ok'=>false,'error'=>'invalid_fields','fields'=>$errors]);

// --- rate limit (SQLite) ---
ensure_dir($conf['STORE_DIR']);
$dbFile = $conf['STORE_DIR'] . '/ratelimit.sqlite';
$pdo = new PDO('sqlite:' . $dbFile);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('CREATE TABLE IF NOT EXISTS hits (ip TEXT, ts INTEGER)');
$ip = client_ip();
$now = time();
$winStart = $now - ($conf['RL_WINDOW_MIN'] * 60);
$dayStart = $now - 86400;

// очистка старых записей
$pdo->exec('DELETE FROM hits WHERE ts < ' . (int)$dayStart);

// подсчёты
$stmt = $pdo->prepare('SELECT COUNT(*) FROM hits WHERE ip=? AND ts>=?');
$stmt->execute([$ip, $winStart]);
$inWin = (int)$stmt->fetchColumn();

$stmt = $pdo->prepare('SELECT COUNT(*) FROM hits WHERE ip=? AND ts>=?');
$stmt->execute([$ip, $dayStart]);
$perDay = (int)$stmt->fetchColumn();

if ($inWin >= (int)$conf['RL_MAX_IN_WIN'])  respond(429, ['ok'=>false,'error'=>'rate_limited_window']);
if ($perDay >= (int)$conf['RL_MAX_PER_DAY']) respond(429, ['ok'=>false,'error'=>'rate_limited_day']);

// записываем хит
$pdo->prepare('INSERT INTO hits (ip, ts) VALUES (?, ?)')->execute([$ip, $now]);

// --- сбор письма ---
$ua  = $_SERVER['HTTP_USER_AGENT'] ?? '';
$ref = $_SERVER['HTTP_REFERER']    ?? '';
$host= $_SERVER['HTTP_HOST']       ?? '';
$subj = 'Заявка с сайта — ' . $host;
$text = "Имя: {$name}\nТелефон: {$phone}\nСообщение: {$message}\n\nIP: {$ip}\nUA: {$ua}\nReferer: {$ref}\nВремя: ".date('Y-m-d H:i:s');
$html = '<h2>Новая заявка</h2>'
      . '<ul>'
      . '<li><b>Имя:</b> ' . htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</li>'
      . '<li><b>Телефон:</b> ' . htmlspecialchars($phone, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</li>'
      . '<li><b>Сообщение:</b> ' . nl2br(htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')) . '</li>'
      . '</ul>'
      . '<hr><small>IP: '.htmlspecialchars($ip).' • UA: '.htmlspecialchars($ua).' • Ref: '.htmlspecialchars($ref).'</small>';

// --- отправка ---
ensure_dir($conf['LOG_DIR']);
$logFile = $conf['LOG_DIR'] . '/' . date('Y-m-d') . '.log';

$sent = false; $sendError = null;
try {
  $usePHPMailer = $conf['USE_SMTP'] && (file_exists(__DIR__.'/vendor/autoload.php') || class_exists('\\PHPMailer\\PHPMailer\\PHPMailer'));
  if ($usePHPMailer) {
    if (!class_exists('\\PHPMailer\\PHPMailer\\PHPMailer')) {
      require __DIR__.'/vendor/autoload.php';
    }
    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    $mail->CharSet = 'UTF-8';
    $mail->isSMTP();
    $mail->Host = $conf['SMTP_HOST'];
    $mail->SMTPAuth = true;
    $mail->Username = $conf['SMTP_USER'];
    $mail->Password = $conf['SMTP_PASS'];
    if ($conf['SMTP_SECURE']) $mail->SMTPSecure = $conf['SMTP_SECURE'];
    $mail->Port = (int)$conf['SMTP_PORT'];
    $mail->setFrom($conf['FROM_EMAIL'], $conf['FROM_NAME']);
    foreach ($conf['TO'] as $rcpt) $mail->addAddress($rcpt);
    $mail->Subject = $subj;
    $mail->isHTML(true);
    $mail->Body = $html;
    $mail->AltBody = $text;
    $sent = $mail->send();
  } else {
    // Fallback через mail()
    $to = implode(',', $conf['TO']);
    $headers = [];
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-type: text/html; charset=UTF-8';
    $headers[] = 'From: ' . $conf['FROM_NAME'] . ' <' . $conf['FROM_EMAIL'] . '>';
    $params = '-f ' . $conf['FROM_EMAIL'];
    $sent = @mail($to, '=?UTF-8?B?'.base64_encode($subj).'?=', $html, implode("\r\n", $headers), $params);
  }
} catch (\Throwable $e) {
  $sendError = $e->getMessage();
}

// --- лог ---
$line = sprintf("[%s] %s %s %s\n", date('H:i:s'), $ip, $sent ? 'SENT' : 'FAIL', $sent ? $subj : ($sendError ?: 'mail() failed'));
@file_put_contents($logFile, $line, FILE_APPEND);

// --- ответ ---
if (!$sent) {
  respond(500, ['ok'=>false,'error'=>'send_failed']);
}

// можно здесь положить в файл-накопитель (CSV/JSON) заявку — по желанию.

respond(200, ['ok'=>true,'status'=>'sent']);

