Add-Type -AssemblyName System.Runtime.WindowsRuntime
$taskType = [Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime]
$taskStreamType = [Windows.Media.SpeechSynthesis.SpeechSynthesisStream,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime]
$taskSynth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$taskSynth.Voice = $taskType::AllVoices | Where-Object { $_.DisplayName -eq 'Microsoft Raul' } | Select-Object -First 1
$taskOperation = $taskSynth.SynthesizeTextToStreamAsync('Este es un repaso del proyecto El Durazno. Vamos a estudiar cómo se conectan la página, el calendario y el servidor.')
$taskMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
$taskGeneric = $taskMethod.MakeGenericMethod($taskStreamType)
$taskAsync = $taskGeneric.Invoke($null, @($taskOperation))
$taskAsync.Wait()
$taskStream = $taskAsync.Result
$taskRead = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($taskStream)
$taskFile = [System.IO.File]::Create((Join-Path (Get-Location) 'tmp\podcast\prueba.wav'))
$taskRead.CopyTo($taskFile)
$taskFile.Dispose()
$taskRead.Dispose()
$taskSynth.Dispose()
Get-Item 'tmp\podcast\prueba.wav' | Select-Object Length
