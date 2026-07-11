<?php
$tran_id = $_POST['tran_id'] ?? '';

echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed - Lagle Janaben</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-gray-50 flex items-center justify-center min-h-screen">
  <div class="max-w-md w-full mx-4 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
    <div class="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
      <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
    <h1 class="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
    <p class="text-sm text-gray-500 mb-8 leading-relaxed">
      Unfortunately, the secure transaction <strong class="text-gray-800 font-mono">{$tran_id}</strong> was failed by the bank or gateway.
    </p>
    <div class="space-y-3">
      <button onclick="window.close()" class="w-full bg-gray-900 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-800 transition-colors">Close This Tab</button>
      <a href="/?ssl_status=fail&tran_id={$tran_id}" class="block w-full border border-gray-200 text-gray-700 bg-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-50 transition-colors">Return to Checkout</a>
    </div>
  </div>
</body>
</html>
HTML;
