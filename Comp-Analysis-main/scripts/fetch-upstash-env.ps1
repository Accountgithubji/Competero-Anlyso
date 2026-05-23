# Fetch Upstash environment variables from Vercel
# Usage: .\scripts\fetch-upstash-env.ps1 -VercelToken "<token>" -ProjectId "<project-id>"

param(
    [string]$VercelToken = $env:VERCEL_TOKEN,
    [string]$ProjectId = $env:VERCEL_PROJECT_ID
)

function Show-Usage {
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\scripts\fetch-upstash-env.ps1 -VercelToken `"<token>`" -ProjectId `"<project-id>`""
    Write-Host ""
    Write-Host "Or set environment variables first:" -ForegroundColor Yellow
    Write-Host "  `$env:VERCEL_TOKEN = `"<your-token>`""
    Write-Host "  `$env:VERCEL_PROJECT_ID = `"<your-project-id>`""
    Write-Host "  .\scripts\fetch-upstash-env.ps1"
    Write-Host ""
    Write-Host "Get your Vercel token from:" -ForegroundColor Cyan
    Write-Host "  https://vercel.com/account/tokens"
    Write-Host ""
    Write-Host "Find your project ID in Vercel dashboard URL:" -ForegroundColor Cyan
    Write-Host "  vercel.com/<team>/<project-id>"
}

if (-not $VercelToken) {
    Write-Host "❌ Error: VERCEL_TOKEN not provided" -ForegroundColor Red
    Show-Usage
    exit 1
}

if (-not $ProjectId) {
    Write-Host "❌ Error: VERCEL_PROJECT_ID not provided" -ForegroundColor Red
    Show-Usage
    exit 1
}

try {
    Write-Host "🔄 Fetching environment variables from Vercel..." -ForegroundColor Cyan
    
    $headers = @{
        "Authorization" = "Bearer $VercelToken"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-WebRequest `
        -Uri "https://api.vercel.com/v9/projects/$ProjectId/env" `
        -Headers $headers `
        -UseBasicParsing
    
    $data = $response.Content | ConvertFrom-Json
    $envs = $data.envs
    
    # Find Upstash variables
    $upstashUrl = $envs | Where-Object { $_.key -eq "UPSTASH_REDIS_REST_URL" }
    $upstashToken = $envs | Where-Object { $_.key -eq "UPSTASH_REDIS_REST_TOKEN" }
    
    if (-not $upstashUrl -or -not $upstashToken) {
        Write-Host "⚠️  Upstash environment variables not found in Vercel" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To set them up:" -ForegroundColor Yellow
        Write-Host "1. Create a Redis database at https://console.upstash.com"
        Write-Host "2. Copy the REST API URL and token"
        Write-Host "3. Add to Vercel: https://vercel.com/<team>/<project>/settings/environment-variables"
        Write-Host "   - UPSTASH_REDIS_REST_URL"
        Write-Host "   - UPSTASH_REDIS_REST_TOKEN"
        exit 1
    }
    
    # Update .env file
    $envPath = Join-Path (Get-Location) ".env"
    $envContent = Get-Content $envPath -Raw
    
    $urlValue = $upstashUrl.value
    $tokenValue = $upstashToken.value
    
    # Replace or add Upstash variables
    if ($envContent -match "UPSTASH_REDIS_REST_URL=") {
        $envContent = $envContent -replace "UPSTASH_REDIS_REST_URL=.*", "UPSTASH_REDIS_REST_URL=$urlValue"
    } else {
        $envContent += "`nUPSTASH_REDIS_REST_URL=$urlValue"
    }
    
    if ($envContent -match "UPSTASH_REDIS_REST_TOKEN=") {
        $envContent = $envContent -replace "UPSTASH_REDIS_REST_TOKEN=.*", "UPSTASH_REDIS_REST_TOKEN=$tokenValue"
    } else {
        $envContent += "`nUPSTASH_REDIS_REST_TOKEN=$tokenValue"
    }
    
    Set-Content -Path $envPath -Value $envContent
    
    Write-Host "✅ Successfully fetched and updated .env file" -ForegroundColor Green
    Write-Host "   UPSTASH_REDIS_REST_URL: $($urlValue.Substring(0, [Math]::Min(50, $urlValue.Length)))..." -ForegroundColor Green
    Write-Host "   UPSTASH_REDIS_REST_TOKEN: $($tokenValue.Substring(0, [Math]::Min(20, $tokenValue.Length)))..." -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Your app is now ready to use Upstash Redis!" -ForegroundColor Green
    Write-Host "   Restart your dev server: npm run dev" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
