!include nsDialogs.nsh
!include LogicLib.nsh

!macro customHeader
  ShowInstDetails show
  ShowUninstDetails show
!macroend

!ifndef BUILD_UNINSTALLER
  Var CV_START_MENU_CHECKBOX
  Var CV_DESKTOP_CHECKBOX
  Var CV_CREATE_START_MENU_SHORTCUT
  Var CV_CREATE_DESKTOP_SHORTCUT

  !macro customInit
    StrCpy $CV_CREATE_START_MENU_SHORTCUT "1"
    StrCpy $CV_CREATE_DESKTOP_SHORTCUT "1"

    ${If} ${isUpdated}
      StrCpy $CV_CREATE_START_MENU_SHORTCUT "0"
      StrCpy $CV_CREATE_DESKTOP_SHORTCUT "0"
    ${EndIf}
  !macroend

  !macro customPageAfterChangeDir
    Page custom ChemVaultShortcutPage ChemVaultShortcutPageLeave
  !macroend

  Function ChemVaultShortcutPage
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 24u "ChemVault Mail.exe will always be installed in the selected installation directory."
    Pop $0

    ${NSD_CreateCheckbox} 0 34u 100% 12u "Add ChemVault Mail to the Start Menu"
    Pop $CV_START_MENU_CHECKBOX
    ${If} $CV_CREATE_START_MENU_SHORTCUT == "1"
      ${NSD_Check} $CV_START_MENU_CHECKBOX
    ${EndIf}

    ${NSD_CreateCheckbox} 0 54u 100% 12u "Create a Desktop shortcut"
    Pop $CV_DESKTOP_CHECKBOX
    ${If} $CV_CREATE_DESKTOP_SHORTCUT == "1"
      ${NSD_Check} $CV_DESKTOP_CHECKBOX
    ${EndIf}

    ${NSD_CreateLabel} 0 80u 100% 30u "The install page shows detailed file copy, shortcut, and registry actions. Keep the details panel open if you want to audit the install contents."
    Pop $0

    nsDialogs::Show
  FunctionEnd

  Function ChemVaultShortcutPageLeave
    ${NSD_GetState} $CV_START_MENU_CHECKBOX $0
    ${If} $0 == ${BST_CHECKED}
      StrCpy $CV_CREATE_START_MENU_SHORTCUT "1"
    ${Else}
      StrCpy $CV_CREATE_START_MENU_SHORTCUT "0"
    ${EndIf}

    ${NSD_GetState} $CV_DESKTOP_CHECKBOX $0
    ${If} $0 == ${BST_CHECKED}
      StrCpy $CV_CREATE_DESKTOP_SHORTCUT "1"
    ${Else}
      StrCpy $CV_CREATE_DESKTOP_SHORTCUT "0"
    ${EndIf}
  FunctionEnd

  !macro customInstall
    ${If} $CV_CREATE_START_MENU_SHORTCUT == "1"
      !insertmacro createMenuDirectory
      CreateShortCut "$newStartMenuLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
      ClearErrors
      WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
      DetailPrint "Created Start Menu shortcut: $newStartMenuLink"
    ${Else}
      DetailPrint "Skipped Start Menu shortcut by user choice."
    ${EndIf}

    ${If} $CV_CREATE_DESKTOP_SHORTCUT == "1"
      CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
      ClearErrors
      WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
      DetailPrint "Created Desktop shortcut: $newDesktopLink"
    ${Else}
      DetailPrint "Skipped Desktop shortcut by user choice."
    ${EndIf}
  !macroend
!endif

!macro customUnInstall
  WinShell::UninstShortcut "$newDesktopLink"
  Delete "$newDesktopLink"
  WinShell::UninstShortcut "$oldDesktopLink"
  Delete "$oldDesktopLink"

  WinShell::UninstShortcut "$newStartMenuLink"
  Delete "$newStartMenuLink"
  WinShell::UninstShortcut "$oldStartMenuLink"
  Delete "$oldStartMenuLink"
!macroend
