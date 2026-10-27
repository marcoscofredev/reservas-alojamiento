Add-Type -AssemblyName System.Runtime.WindowsRuntime
$taskType = [Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime]
$taskStreamType = [Windows.Media.SpeechSynthesis.SpeechSynthesisStream,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime]
$taskSynth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$taskSynth.Voice = $taskType::AllVoices | Where-Object { $_.DisplayName -eq 'Microsoft Raul' } | Select-Object -First 1
$taskText = [IO.File]::ReadAllText((Join-Path (Get-Location) 'output\audio\El-Durazno-repaso-completo.txt'),[Text.Encoding]::UTF8)
$taskParagraphs = $taskText -split '(\r?\n){2,}' | Where-Object { $_.Trim().Length -gt 0 }
$taskXmlText = ($taskParagraphs | ForEach-Object { [Security.SecurityElement]::Escape($_.Trim()) }) -join '<break time="350ms"/>'
$taskSsml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="es-MX"><prosody rate="-3%">' + $taskXmlText + '</prosody></speak>'
$taskOperation = $taskSynth.SynthesizeSsmlToStreamAsync($taskSsml)
$taskMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
$taskAsync = $taskMethod.MakeGenericMethod($taskStreamType).Invoke($null,@($taskOperation))
$taskAsync.Wait()
$taskRead = [IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($taskAsync.Result)
$taskFile = [IO.File]::Create((Join-Path (Get-Location) 'tmp\podcast\El-Durazno-repaso-completo.wav'))
$taskRead.CopyTo($taskFile)
$taskFile.Dispose()
$taskRead.Dispose()
$taskSynth.Dispose()
Get-Item 'tmp\podcast\El-Durazno-repaso-completo.wav' | Select-Object Name,Length
& (Join-Path (Get-Location) 'tmp\podcast\convertir-mp3.ps1') -InputWav (Join-Path (Get-Location) 'tmp\podcast\El-Durazno-repaso-completo.wav') -OutputMp3 (Join-Path (Get-Location) 'output\audio\El-Durazno-repaso-completo.mp3')
