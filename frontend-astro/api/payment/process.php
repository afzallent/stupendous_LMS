<?php
// Allow cross-origin requests (CORS)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Ensure this is a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Only POST requests are allowed']);
    exit();
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate input
if (!isset($input['courseId']) || !isset($input['userId']) || !isset($input['amount']) || !isset($input['paymentMethod'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

// Extract payment details
$courseId = $input['courseId'];
$userId = $input['userId'];
$amount = floatval($input['amount']);
$paymentMethod = $input['paymentMethod'];
$cardDetails = $input['cardDetails'] ?? null;

// Validate amount
if ($amount <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid payment amount']);
    exit();
}

// In a real implementation, this would connect to a payment gateway
// For this demo, we'll just simulate a successful payment

// Generate a random transaction ID
$transactionId = 'TXN' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 10));

// Simulate payment processing delay
sleep(1);

// Prepare response data
$response = [
    'success' => true,
    'message' => 'Payment processed successfully',
    'data' => [
        'transactionId' => $transactionId,
        'amount' => $amount,
        'courseId' => $courseId,
        'userId' => $userId,
        'timestamp' => date('Y-m-d H:i:s'),
        'status' => 'completed'
    ]
];

// In a real implementation, you would also:
// 1. Save the transaction to the database
// 2. Update the user's enrollment status for the course
// 3. Send a confirmation email

http_response_code(200);
echo json_encode($response);
exit();
?> 