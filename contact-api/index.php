<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Vary: Origin');

function reply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

$allowedOrigins = [
    'https://bemarketinggroup.it', 'https://www.bemarketinggroup.it',
    'https://noisystyle.github.io', 'https://bemarketinggroup-del.github.io',
    'http://127.0.0.1:8080', 'http://127.0.0.1:8081',
    'http://localhost:8080', 'http://localhost:8081',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!in_array($origin, $allowedOrigins, true)) {
    reply(403, ['ok' => false, 'error' => 'origin_not_allowed']);
}
header('Access-Control-Allow-Origin: ' . $origin);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST, OPTIONS');
    reply(405, ['ok' => false, 'error' => 'method_not_allowed']);
}
if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
    reply(415, ['ok' => false, 'error' => 'json_required']);
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 20000) {
    reply(413, ['ok' => false, 'error' => 'request_too_large']);
}
$raw = file_get_contents('php://input', false, null, 0, 20001);
if ($raw === false || strlen($raw) > 20000) {
    reply(413, ['ok' => false, 'error' => 'request_too_large']);
}
$data = json_decode($raw, true);
if (!is_array($data)) {
    reply(400, ['ok' => false, 'error' => 'invalid_json']);
}
function field(array $data, string $key, int $max, bool $required = false): string {
    if (isset($data[$key]) && !is_string($data[$key])) {
        reply(422, ['ok' => false, 'error' => 'invalid_fields']);
    }
    $value = trim($data[$key] ?? '');
    if (($required && $value === '') || strlen($value) > $max || strpos($value, "\0") !== false) {
        reply(422, ['ok' => false, 'error' => 'invalid_fields']);
    }
    return $value;
}
if (field($data, 'website', 500) !== '') {
    reply(422, ['ok' => false, 'error' => 'invalid_fields']);
}
$name = field($data, 'name', 200, true);
$email = field($data, 'email', 254, true);
$service = field($data, 'service', 200);
$message = field($data, 'message', 12000, true);
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $name . $email . $service)) {
    reply(422, ['ok' => false, 'error' => 'invalid_fields']);
}
$metadata = $data['metadata'] ?? [];
if (!is_array($metadata)) {
    reply(422, ['ok' => false, 'error' => 'invalid_fields']);
}
$form = field($metadata, 'form', 80, true);
$forms = ['bmg_contact' => 'Sito BMG', 'bmg_hospitality_landing' => 'Landing Hospitality', 'beviral_contact' => 'BeViral'];
if (!isset($forms[$form])) {
    reply(422, ['ok' => false, 'error' => 'invalid_form']);
}
$page = field($metadata, 'page', 1000);
$hotel = field($metadata, 'hotel', 300);
$turnstileToken = field($data, 'turnstileToken', 2048);
if ($turnstileToken === '') reply(403, ['ok' => false, 'error' => 'verification_failed']);

// On DirectAdmin: domains/bemarketinggroup.it/private/bmg-mail.php.
// This is outside public_html and must never be committed or served publicly.
$configPath = getenv('BMG_MAIL_CONFIG') ?: dirname(__DIR__, 2) . '/private/bmg-mail.php';
if (!is_file($configPath)) {
    reply(503, ['ok' => false, 'error' => 'mail_not_configured']);
}
$config = require $configPath;
foreach (['host', 'username', 'password', 'recipient'] as $key) {
    if (!is_array($config) || empty($config[$key]) || !is_string($config[$key])) {
        reply(503, ['ok' => false, 'error' => 'mail_not_configured']);
    }
}

require __DIR__ . '/turnstile.php';
$secretPath = dirname($configPath) . '/bmg-turnstile-secret.txt';
$turnstileSecret = is_file($secretPath) ? trim(file_get_contents($secretPath)) : '';
if ($turnstileSecret === '' || !function_exists('curl_init')) {
    reply(503, ['ok' => false, 'error' => 'verification_not_configured']);
}
if (!bmg_verify_turnstile($turnstileToken, $turnstileSecret, (string) parse_url($origin, PHP_URL_HOST), $form)) {
    reply(403, ['ok' => false, 'error' => 'verification_failed']);
}

// Reserve each attempt atomically; no addresses or messages are stored here.
$ratePath = dirname($configPath) . '/bmg-contact-rate.json';
$rateFile = fopen($ratePath, 'c+');
if (!$rateFile || !flock($rateFile, LOCK_EX)) {
    reply(503, ['ok' => false, 'error' => 'temporarily_unavailable']);
}
chmod($ratePath, 0600);
$now = time();
$rate = json_decode(stream_get_contents($rateFile), true) ?: [];
$rate = array_filter($rate, static function ($entry) use ($now) { return is_array($entry) && ($entry['until'] ?? 0) > $now; });
$ipKey = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $config['password']);
$globalKey = 'daily';
$ip = $rate[$ipKey] ?? ['until' => $now + 3600, 'count' => 0];
$global = $rate[$globalKey] ?? ['until' => $now + 86400, 'count' => 0];
if ($ip['count'] >= 10 || $global['count'] >= 100) {
    $retry = max(1, ($ip['count'] >= 10 ? $ip['until'] : $global['until']) - $now);
    flock($rateFile, LOCK_UN);
    fclose($rateFile);
    header('Retry-After: ' . $retry);
    reply(429, ['ok' => false, 'error' => 'rate_limited']);
}
$ip['count']++;
$global['count']++;
$rate[$ipKey] = $ip;
$rate[$globalKey] = $global;
$encoded = json_encode($rate);
rewind($rateFile);
$saved = ftruncate($rateFile, 0) && fwrite($rateFile, $encoded) === strlen($encoded) && fflush($rateFile);
flock($rateFile, LOCK_UN);
fclose($rateFile);
if (!$saved) {
    reply(503, ['ok' => false, 'error' => 'temporarily_unavailable']);
}

require __DIR__ . '/lib/PHPMailer/Exception.php';
require __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require __DIR__ . '/lib/PHPMailer/SMTP.php';
try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $config['host'];
    $mail->Port = 587;
    $mail->SMTPAuth = true;
    $mail->Username = $config['username'];
    $mail->Password = $config['password'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Timeout = 12;
    $mail->Timelimit = 20;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom($config['username'], 'Be Marketing Group');
    $mail->addAddress($config['recipient']);
    $mail->addReplyTo($email, $name);
    $mail->Subject = 'Nuova richiesta — ' . $forms[$form];
    $mail->Body = "Provenienza: {$forms[$form]}\nNome: {$name}\nEmail: {$email}\nInteresse: {$service}\n";
    if ($hotel !== '') $mail->Body .= "Struttura: {$hotel}\n";
    $mail->Body .= "Pagina: {$page}\n\nMessaggio:\n{$message}\n";
    $mail->send();
    reply(200, ['ok' => true]);
} catch (Throwable $error) {
    // Do not expose credentials, SMTP transcripts or visitors' data in responses/logs.
    error_log('BMG contact: SMTP delivery failed');
    reply(502, ['ok' => false, 'error' => 'delivery_failed']);
}
