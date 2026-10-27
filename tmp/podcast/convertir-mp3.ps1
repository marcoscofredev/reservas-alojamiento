param([string]$InputWav, [string]$OutputMp3)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null = [Windows.Media.Transcoding.MediaTranscoder,Windows.Media.Transcoding,ContentType=WindowsRuntime]
$null = [Windows.Media.MediaProperties.MediaEncodingProfile,Windows.Media.MediaProperties,ContentType=WindowsRuntime]
$null = [Windows.Media.Transcoding.PrepareTranscodeResult,Windows.Media.Transcoding,ContentType=WindowsRuntime]
function Await-Operation($operation, [Type]$resultType) {
    $taskMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
    $task = $taskMethod.MakeGenericMethod($resultType).Invoke($null, @($operation))
    $task.Wait()
    return $task.Result
}
$taskInput = Await-Operation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($InputWav)) ([Windows.Storage.StorageFile])
[IO.File]::WriteAllBytes($OutputMp3,[byte[]]@())
$taskOutput = Await-Operation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($OutputMp3)) ([Windows.Storage.StorageFile])
$taskProfile = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateMp3([Windows.Media.MediaProperties.AudioEncodingQuality]::Medium)
$taskEncoder = New-Object Windows.Media.Transcoding.MediaTranscoder
$taskPrepare = Await-Operation ($taskEncoder.PrepareFileTranscodeAsync($taskInput,$taskOutput,$taskProfile)) ([Windows.Media.Transcoding.PrepareTranscodeResult])
if (-not $taskPrepare.CanTranscode) { throw ('No se pudo convertir: ' + $taskPrepare.FailureReason) }
$taskAction = $taskPrepare.TranscodeAsync()
$taskActionMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncActionWithProgress`1' } | Select-Object -First 1
$taskFinished = $taskActionMethod.MakeGenericMethod([double]).Invoke($null,@($taskAction))
$taskFinished.Wait()
Get-Item -LiteralPath $OutputMp3 | Select-Object Name,Length
