<?php
require __DIR__ . '/../contact-api/turnstile.php';
$valid = ['success' => true, 'hostname' => 'bemarketinggroup.it', 'action' => 'bmg_contact'];
$cases = [[$valid, true], [null, false], [[], false],
 [array_replace($valid, ['success' => false]), false],
 [array_replace($valid, ['success' => 'true']), false],
 [array_replace($valid, ['hostname' => 'evil.example']), false],
 [array_replace($valid, ['action' => 'beviral_contact']), false],
 [array_replace($valid, ['hostname' => '']), false]];
foreach ($cases as $i => [$result, $expected]) {
    if (bmg_turnstile_matches($result, 'bemarketinggroup.it', 'bmg_contact') !== $expected) {
        throw new RuntimeException("Failed verification case $i");
    }
}
echo "PASS: 8 Turnstile response checks\n";
