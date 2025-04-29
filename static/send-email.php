<?php
// TEMPORARILY ADD THESE LINES FOR DEBUGGING IF NEEDED (REMOVE LATER)
// ini_set('display_errors', 1);
// ini_set('display_startup_errors', 1);
// error_reporting(E_ALL);

// --- Configuration ---
$recipient_email = "jriddiough@gmail.com"; // <<< REPLACE with your actual email address
$subject         = "New Contact Form Message from VisionInit Website";

// --- Basic Security Check ---
// Only process POST requests.
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405); // Method Not Allowed
    // If accessed directly via GET, show a simple message or redirect
    // For direct access debugging with error reporting enabled, you might comment out the exit temporarily
    // echo "This script should be accessed via POST.";
    // For AJAX, we return JSON
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

// --- Get Data & Initialize ---
$name    = isset($_POST['name']) ? trim($_POST['name']) : '';
$email   = isset($_POST['email']) ? trim($_POST['email']) : '';
$message = isset($_POST['message']) ? trim($_POST['message']) : '';
$errors  = [];
$response = ['status' => 'error', 'message' => 'An unexpected error occurred.']; // Default response

// --- Validation ---
if (empty($name)) {
    $errors['name'] = 'Name is required.';
}

if (empty($email)) {
    $errors['email'] = 'Email is required.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Invalid email format.';
}

if (empty($message)) {
    $errors['message'] = 'Message is required.';
}

// --- Process ---
if (empty($errors)) {
    // Sanitize data before using in email body
    $sanitized_name = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $sanitized_email = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
    $sanitized_message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');

    // Compose Email Body (Plain Text)
    $email_body = "You have received a new message from your website contact form.\n\n";
    $email_body .= "Name: " . $sanitized_name . "\n";
    $email_body .= "Email: " . $sanitized_email . "\n\n";
    $email_body .= "Message:\n" . $sanitized_message . "\n";

    // Headers
    $server_name = $_SERVER['SERVER_NAME'] ?? 'visioninit.dev'; // Fallback domain
    $headers = "From: no-reply@" . $server_name . "\r\n"; // Use a generic no-reply from your domain
    $headers .= "Reply-To: " . $email . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    // Attempt to send email
    if (mail($recipient_email, $subject, $email_body, $headers)) {
        $response = ['status' => 'success', 'message' => 'Your message has been sent successfully!'];
    } else {
         // Log error internally if possible
         error_log("Mail function failed for contact form submission from $email to $recipient_email");
         $response = ['status' => 'error', 'message' => 'Sorry, there was an error sending your message. Please try again later.'];
    }

} else {
    // Validation failed
    $error_message = "Please check the form for errors and try again."; // Simpler message
    $response = ['status' => 'error', 'message' => $error_message, 'errors' => $errors];
}

// --- Return JSON Response ---
// Ensure no output before this header call
if (!headers_sent()) {
    header('Content-Type: application/json');
} else {
    // Log if headers were already sent (can happen if PHP errors were displayed)
    error_log("Headers already sent before JSON response in send_email.php");
}
echo json_encode($response);
exit;
?>
