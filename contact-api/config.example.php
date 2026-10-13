<?php
// Store as domains/bemarketinggroup.it/private/bmg-mail.php, OUTSIDE public_html.
// Store the mailbox password alone in private/bmg-smtp-password.txt (permissions 600).
return [
    'host' => 'mail.bemarketinggroup.it',
    'username' => 'noreply@bemarketinggroup.it',
    'password' => is_file(__DIR__ . '/bmg-smtp-password.txt') ? rtrim(file_get_contents(__DIR__ . '/bmg-smtp-password.txt'), "\r\n") : '',
    'recipient' => 'info@bemarketinggroup.it',
];
