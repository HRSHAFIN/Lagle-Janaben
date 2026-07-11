<?php

$server   = "localhost";
$username = "root";
$password = "";
$dbname   = "lagle_janaben";

try {
    $conn = new PDO("mysql:host=$server;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
