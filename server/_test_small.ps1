$body = '{"stepId":1,"user":"请只回复两个字：你好","outputType":"text"}'
try {
  $r = Invoke-RestMethod -Uri 'http://localhost:3456/api/genesis/step' -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 120
  Write-Output ("OK output=" + ($r.output | Out-String).Trim())
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  $msg = $_.ErrorDetails.Message
  Write-Output ("FAIL status=" + $code + " body=" + $msg)
}
