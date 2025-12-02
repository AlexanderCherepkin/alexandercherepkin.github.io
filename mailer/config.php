<?php
// UTF-8
return [
  // Отправка
  'FROM_EMAIL' => 'no-reply@your-domain.tld',
  'FROM_NAME'  => 'Сайт ПрофРемонт',
  'TO'         => ['orders@your-domain.tld'], // можно несколько адресов

  // SMTP (опционально). Если есть vendor с PHPMailer — будет использован SMTP.
  'USE_SMTP'   => true,
  'SMTP_HOST'  => 'smtp.hoster.by',
  'SMTP_PORT'  => 465,
  'SMTP_SECURE'=> 'ssl',   // 'ssl' | 'tls' | ''
  'SMTP_USER'  => 'no-reply@your-domain.tld',
  'SMTP_PASS'  => '********',

  // Rate limit
  'RL_WINDOW_MIN'  => 10,  // окно X минут
  'RL_MAX_IN_WIN'  => 3,   // не более N заявок за окно
  'RL_MAX_PER_DAY' => 10,  // не более N заявок за сутки

  // Прочее
  'LOG_DIR'   => __DIR__ . '/logs',
  'STORE_DIR' => __DIR__ . '/storage',
];
