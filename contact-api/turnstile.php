<?php
declare(strict_types=1);

function bmg_turnstile_matches($result, string $hostname, string $action): bool {
    return is_array($result)
        && ($result['success'] ?? false) === true
        && ($result['hostname'] ?? '') === $hostname
        && ($result['action'] ?? '') === $action;
}

function bmg_verify_turnstile(string $token, string $secret, string $hostname, string $action): bool {
    $curl = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    if ($curl === false) return false;
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query(['secret' => $secret, 'response' => $token]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    ]);
    $body = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    if (!is_string($body) || $status !== 200) return false;
    return bmg_turnstile_matches(json_decode($body, true), $hostname, $action);
}
