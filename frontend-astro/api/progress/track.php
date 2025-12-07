<?php
// Allow cross-origin requests (CORS)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Function to get progress for a user
function getProgress($userId, $courseId = null) {
    // In a real implementation, this would query a database
    // For demo purposes, we'll return mock data
    
    // Sample progress data structure
    $progress = [
        'user_1' => [
            'course_1' => [
                'progress' => 65,
                'completed_lessons' => ['lesson_1', 'lesson_2', 'lesson_3'],
                'last_lesson' => 'lesson_3',
                'last_accessed' => '2023-06-15 14:30:00'
            ],
            'course_2' => [
                'progress' => 25,
                'completed_lessons' => ['lesson_1'],
                'last_lesson' => 'lesson_1',
                'last_accessed' => '2023-06-14 10:15:00'
            ]
        ],
        'user_2' => [
            'course_1' => [
                'progress' => 100,
                'completed_lessons' => ['lesson_1', 'lesson_2', 'lesson_3', 'lesson_4', 'lesson_5'],
                'last_lesson' => 'lesson_5',
                'last_accessed' => '2023-06-10 16:45:00'
            ]
        ]
    ];
    
    // If user doesn't exist in our mock data, return empty progress
    if (!isset($progress[$userId])) {
        return $courseId ? [] : [];
    }
    
    // If courseId is provided, return progress for that course only
    if ($courseId && isset($progress[$userId][$courseId])) {
        return $progress[$userId][$courseId];
    }
    
    // Otherwise return all progress for the user
    return $progress[$userId];
}

// Function to update progress
function updateProgress($userId, $courseId, $lessonId, $completed = false) {
    // In a real implementation, this would update a database
    // For demo purposes, we'll just return a success response
    
    return [
        'success' => true,
        'message' => 'Progress updated successfully',
        'data' => [
            'userId' => $userId,
            'courseId' => $courseId,
            'lessonId' => $lessonId,
            'completed' => $completed,
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ];
}

// Handle GET request - retrieve progress
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Check if required parameters are present
    if (!isset($_GET['userId'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        exit();
    }
    
    $userId = $_GET['userId'];
    $courseId = $_GET['courseId'] ?? null;
    
    $progressData = getProgress($userId, $courseId);
    
    echo json_encode([
        'success' => true,
        'data' => $progressData
    ]);
    exit();
}

// Handle POST request - update progress
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (!isset($input['userId']) || !isset($input['courseId']) || !isset($input['lessonId'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }
    
    $userId = $input['userId'];
    $courseId = $input['courseId'];
    $lessonId = $input['lessonId'];
    $completed = $input['completed'] ?? false;
    
    $result = updateProgress($userId, $courseId, $lessonId, $completed);
    
    echo json_encode($result);
    exit();
}

// If we get here, the request method is not supported
http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
exit();
?> 