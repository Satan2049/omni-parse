!macro NSIS_HOOK_PREINSTALL
  nsExec::Exec 'taskkill /F /IM omniparse.exe /T'
  nsExec::Exec 'taskkill /F /IM app.exe /T'
  Sleep 2000
  Delete "$INSTDIR\omniparse.exe"
  Delete "$INSTDIR\app.exe"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  nsExec::Exec 'taskkill /F /IM omniparse.exe /T'
  nsExec::Exec 'taskkill /F /IM app.exe /T'
  Sleep 2000
!macroend
