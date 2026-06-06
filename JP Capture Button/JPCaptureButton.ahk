#Requires AutoHotkey v2.0
#SingleInstance Force
; =====================================================================
;  JP Capture Button - a one-key command centre for Windows
; ---------------------------------------------------------------------
;  Press the main hotkey (default Ctrl + Alt + J) to pop up a menu near
;  the cursor. Pick an action: clipboard, screenshots, OCR, Microsoft
;  365, browser captures, PowerToys and quick work launchers.
;
;  Everything you'd want to change lives in config.ini, not in here.
; =====================================================================

; ---------------------------------------------------------------------
;  Global setup
; ---------------------------------------------------------------------
ScriptDir := A_ScriptDir
ConfigFile := ScriptDir "\config.ini"
CFG := Map()            ; holds all loaded settings
LoadConfig()
EnsureFolders()

; Register the main hotkey from config (default Ctrl + Alt + J).
Hotkey CFG["MainMenuHotkey"], (*) => ShowCommandCentre()

; Friendly tray menu so it doesn't feel like a black box.
A_TrayMenu.Delete()
A_TrayMenu.Add("Open JP Capture Button menu", (*) => ShowCommandCentre())
A_TrayMenu.Add("Open capture folder", (*) => OpenCaptureFolder())
A_TrayMenu.Add()
A_TrayMenu.Add("Edit config", (*) => Run('notepad.exe "' ConfigFile '"'))
A_TrayMenu.Add("Reload", (*) => Reload())
A_TrayMenu.Add("Exit", (*) => ExitApp())
A_TrayMenu.Default := "Open JP Capture Button menu"
TraySetIcon("shell32.dll", 44)   ; little camera-ish icon
A_IconTip := "JP Capture Button  (" PrettyHotkey(CFG["MainMenuHotkey"]) ")"

return  ; ----- end of auto-execute section -----


; =====================================================================
;  Config loading
; =====================================================================
LoadConfig() {
    global CFG, ConfigFile
    if !FileExist(ConfigFile) {
        MsgBox "Can't find config.ini next to the script.`n`nExpected here:`n" ConfigFile,
            "JP Capture Button", "Iconx"
        ExitApp()
    }

    CFG["MainMenuHotkey"] := IniRead(ConfigFile, "Hotkeys", "MainMenu", "^!j")

    base := IniRead(ConfigFile, "Folders", "BaseFolder", "")
    if (base = "")
        base := A_MyDocuments "\JP Capture Button"
    CFG["BaseFolder"] := base
    CFG["ScreenshotsFolder"] := base "\" IniRead(ConfigFile, "Folders", "ScreenshotsSubfolder", "Screenshots")
    CFG["ClipboardSavesFolder"] := base "\" IniRead(ConfigFile, "Folders", "ClipboardSavesSubfolder", "Clipboard Saves")

    dl := IniRead(ConfigFile, "Folders", "DownloadsFolder", "")
    if (dl = "")
        dl := EnvGet("USERPROFILE") "\Downloads"
    CFG["DownloadsFolder"] := dl

    CFG["BrowserTimeout"] := Integer(IniRead(ConfigFile, "Behaviour", "BrowserCaptureTimeout", "20"))
    CFG["PreviewChars"] := Integer(IniRead(ConfigFile, "Behaviour", "ClipboardPreviewChars", "500"))

    ; URLs
    for key in ["Microsoft365","OutlookWeb","OneDrive","SharePoint","Copilot365","Teams","ChatGPT","Claude","GitHubCopilot","VSCodeWeb"]
        CFG["URL_" key] := IniRead(ConfigFile, "URLs", key, "")

    ; PowerToys shortcuts
    for key in ["TextExtractor","ColorPicker","FancyZones","AlwaysOnTop","Run"]
        CFG["PT_" key] := IniRead(ConfigFile, "PowerToys", key, "")
}

EnsureFolders() {
    global CFG
    for k in ["BaseFolder","ScreenshotsFolder","ClipboardSavesFolder"]
        if !DirExist(CFG[k])
            DirCreate(CFG[k])
}


; =====================================================================
;  The pop-up command centre
; =====================================================================
ShowCommandCentre() {
    m := Menu()

    m.Add("1.  Clipboard preview", (*) => ClipboardPreview())
    m.Add("2.  Normal screenshot", BuildScreenshotMenu())
    m.Add("3.  Screenshot + Microsoft 365", BuildM365Menu())
    m.Add("4.  Chrome full-page screenshot", (*) => BrowserFullPage("chrome.exe", "Chrome"))
    m.Add("5.  Edge full-page screenshot", (*) => BrowserFullPage("msedge.exe", "Edge"))
    m.Add("6.  Extract text from screen (OCR)", (*) => ExtractText())
    m.Add()
    m.Add("PowerToys quick actions", BuildPowerToysMenu())
    m.Add("Quick work launchers", BuildLaunchersMenu())
    m.Add()
    m.Add("9.  Save clipboard as file", (*) => SaveClipboardAsFile())
    m.Add("10. Open capture folder", (*) => OpenCaptureFolder())

    m.Show()  ; appears at the cursor by default
}


; ---------------------------------------------------------------------
;  1. Clipboard preview
; ---------------------------------------------------------------------
ClipboardPreview() {
    global CFG
    if ClipboardHasImage() {
        MsgBox "Your clipboard currently holds an image.`n`nUse 'Save clipboard as file' to drop it into your captures folder as a PNG.",
            "Clipboard preview", "Iconi"
        return
    }

    text := A_Clipboard
    if (text = "") {
        MsgBox "Your clipboard is empty.", "Clipboard preview", "Iconi"
        return
    }

    preview := SubStr(text, 1, CFG["PreviewChars"])
    if (StrLen(text) > CFG["PreviewChars"])
        preview .= "`n`n... (showing first " CFG["PreviewChars"] " characters)"

    sub := Menu()
    sub.Add("Open in Notepad", (*) => OpenClipboardInNotepad())
    sub.Add("Save to timestamped .txt", (*) => SaveTextToFile(A_Clipboard))
    sub.Add("Clear clipboard", (*) => (A_Clipboard := "", Toast("Clipboard cleared.")))
    sub.Add()
    sub.Add("Close", (*) => "")

    ; Show the preview, then offer the actions menu.
    MsgBox preview, "Clipboard preview", "Iconi"
    sub.Show()
}

OpenClipboardInNotepad() {
    tmp := A_Temp "\jpcb_clip_" TimeStamp() ".txt"
    FileAppend(A_Clipboard, tmp, "UTF-8")
    Run('notepad.exe "' tmp '"')
}


; ---------------------------------------------------------------------
;  2. Normal screenshot
; ---------------------------------------------------------------------
BuildScreenshotMenu() {
    sub := Menu()
    sub.Add("Full screen to clipboard", (*) => (Send("{PrintScreen}"), Toast("Full screen copied to clipboard.")))
    sub.Add("Region snip to clipboard", (*) => (Send("#+s"), Toast("Drag to snip a region.")))
    sub.Add("Window snip to clipboard", (*) => StartSnipHint())
    return sub
}

StartSnipHint() {
    ; Win+Shift+S opens the Snip toolbar; the user picks 'Window' mode there.
    Send("#+s")
    Toast("Choose 'Window' mode in the snip toolbar.")
}


; ---------------------------------------------------------------------
;  3. Screenshot + open Microsoft 365
; ---------------------------------------------------------------------
BuildM365Menu() {
    global CFG
    sub := Menu()
    sub.Add("Snip a region, then open Microsoft 365", (*) => SnipThenOpen(CFG["URL_Microsoft365"]))
    sub.Add()
    sub.Add("Open Microsoft 365", (*) => OpenURL(CFG["URL_Microsoft365"]))
    sub.Add("Open Outlook Web", (*) => OpenURL(CFG["URL_OutlookWeb"]))
    sub.Add("Open OneDrive", (*) => OpenURL(CFG["URL_OneDrive"]))
    sub.Add("Open SharePoint", (*) => OpenURL(CFG["URL_SharePoint"]))
    sub.Add("Open Microsoft 365 Copilot", (*) => OpenURL(CFG["URL_Copilot365"]))
    return sub
}

SnipThenOpen(url) {
    Send("#+s")            ; start region snip
    Toast("Snip your region, then Microsoft 365 will open.")
    Sleep 1500
    OpenURL(url)
}


; ---------------------------------------------------------------------
;  4 & 5. Browser full-page screenshots (Chrome / Edge via DevTools)
; ---------------------------------------------------------------------
BrowserFullPage(exe, label) {
    global CFG
    if !WinExist("ahk_exe " exe) {
        MsgBox label " doesn't appear to be open.`n`nOpen " label ", go to the page you want, then try again.",
            "Browser screenshot", "Iconx"
        return
    }
    WinActivate("ahk_exe " exe)
    if !WinWaitActive("ahk_exe " exe, , 3) {
        MsgBox "Couldn't bring " label " to the front. Click on it and try again.",
            "Browser screenshot", "Iconx"
        return
    }

    startStamp := A_Now   ; remember when we started so we can spot the new file

    ; DevTools command-menu method: F12, Ctrl+Shift+P, type command, Enter.
    Send("{F12}")
    Sleep 1200
    Send("^+p")
    Sleep 600
    SendText("Capture full size screenshot")
    Sleep 600
    Send("{Enter}")

    Toast("Capturing full page... watching Downloads.")
    file := WaitForNewScreenshot(CFG["DownloadsFolder"], startStamp, CFG["BrowserTimeout"])

    ; Close DevTools again to leave things tidy.
    if WinActive("ahk_exe " exe)
        Send("{F12}")

    if (file = "") {
        MsgBox "No screenshot turned up in your Downloads folder within " CFG["BrowserTimeout"] " seconds."
            . "`n`nThings to check:`n - Was the page fully loaded?`n - Is your Downloads folder set correctly in config.ini?",
            "Browser screenshot", "Iconx"
        return
    }

    dest := MoveIntoScreenshots(file)
    ImageFileToClipboard(dest)
    Toast("Saved and copied to clipboard:`n" dest)
}

WaitForNewScreenshot(folder, startStamp, timeoutSec) {
    deadline := A_TickCount + (timeoutSec * 1000)
    loop {
        newest := "", newestTime := ""
        Loop Files folder "\*.png" {
            if (A_LoopFileTimeModified >= startStamp) {
                if (newestTime = "" || A_LoopFileTimeModified > newestTime) {
                    newestTime := A_LoopFileTimeModified
                    newest := A_LoopFileFullPath
                }
            }
        }
        if (newest != "") {
            ; Wait until the file stops growing, so we don't grab a half-written file.
            if FileSettled(newest)
                return newest
        }
        if (A_TickCount > deadline)
            return ""
        Sleep 400
    }
}

FileSettled(path) {
    try size1 := FileGetSize(path)
    catch
        return false
    Sleep 500
    try size2 := FileGetSize(path)
    catch
        return false
    return (size1 = size2 && size1 > 0)
}

MoveIntoScreenshots(srcFile) {
    global CFG
    SplitPath(srcFile, , , &ext, &nameNoExt)
    dest := CFG["ScreenshotsFolder"] "\" nameNoExt "_" TimeStamp() "." ext
    try {
        FileMove(srcFile, dest, true)
        return dest
    } catch {
        ; If the move fails (file locked), fall back to a copy.
        FileCopy(srcFile, dest, true)
        return dest
    }
}


; ---------------------------------------------------------------------
;  6. Extract text from screen (PowerToys Text Extractor / OCR)
; ---------------------------------------------------------------------
ExtractText() {
    global CFG
    if !PowerToysRunning() {
        MsgBox "Text Extractor needs PowerToys.`n`nInstall it from the Microsoft Store (search 'PowerToys'), "
            . "turn on Text Extractor, then try again.",
            "Extract text", "Iconi"
        return
    }

    A_Clipboard := ""               ; clear so we can detect the OCR result
    Send(CFG["PT_TextExtractor"])   ; default Win+Shift+T
    Toast("Drag over the text you want to grab.")

    if !ClipWait(15) {
        Toast("No text captured (timed out).")
        return
    }

    sub := Menu()
    sub.Add("Keep on clipboard (done)", (*) => Toast("Text is on your clipboard."))
    sub.Add("Save to timestamped .txt", (*) => SaveTextToFile(A_Clipboard))
    sub.Show()
}


; ---------------------------------------------------------------------
;  7. PowerToys quick actions
; ---------------------------------------------------------------------
BuildPowerToysMenu() {
    global CFG
    sub := Menu()
    sub.Add("Text Extractor", (*) => SendPowerToy("PT_TextExtractor"))
    sub.Add("Colour Picker", (*) => SendPowerToy("PT_ColorPicker"))
    sub.Add("FancyZones editor", (*) => SendPowerToy("PT_FancyZones"))
    sub.Add("Always on Top", (*) => SendPowerToy("PT_AlwaysOnTop"))
    sub.Add("PowerToys Run", (*) => SendPowerToy("PT_Run"))
    return sub
}

SendPowerToy(key) {
    global CFG
    if !PowerToysRunning() {
        MsgBox "This is a PowerToys feature. Install PowerToys and make sure it's running, then try again.",
            "PowerToys", "Iconi"
        return
    }
    Send(CFG[key])
}


; ---------------------------------------------------------------------
;  8. Quick work launchers
; ---------------------------------------------------------------------
BuildLaunchersMenu() {
    global CFG
    sub := Menu()
    sub.Add("Microsoft 365", (*) => OpenURL(CFG["URL_Microsoft365"]))
    sub.Add("Outlook", (*) => OpenURL(CFG["URL_OutlookWeb"]))
    sub.Add("OneDrive", (*) => OpenURL(CFG["URL_OneDrive"]))
    sub.Add("SharePoint", (*) => OpenURL(CFG["URL_SharePoint"]))
    sub.Add("Teams", (*) => OpenURL(CFG["URL_Teams"]))
    sub.Add()
    sub.Add("ChatGPT", (*) => OpenURL(CFG["URL_ChatGPT"]))
    sub.Add("Claude", (*) => OpenURL(CFG["URL_Claude"]))
    sub.Add("Microsoft 365 Copilot", (*) => OpenURL(CFG["URL_Copilot365"]))
    sub.Add("GitHub Copilot", (*) => OpenURL(CFG["URL_GitHubCopilot"]))
    sub.Add("VS Code (web)", (*) => OpenURL(CFG["URL_VSCodeWeb"]))
    return sub
}


; ---------------------------------------------------------------------
;  9. Save clipboard as file (text -> .txt, image -> .png)
; ---------------------------------------------------------------------
SaveClipboardAsFile() {
    global CFG
    if ClipboardHasImage() {
        dest := CFG["ClipboardSavesFolder"] "\clipboard_" TimeStamp() ".png"
        if SaveClipboardImage(dest)
            Toast("Image saved:`n" dest)
        else
            MsgBox "Couldn't save the clipboard image.", "Save clipboard", "Iconx"
        return
    }

    if (A_Clipboard != "") {
        SaveTextToFile(A_Clipboard)
        return
    }

    MsgBox "There's nothing on your clipboard to save.", "Save clipboard", "Iconi"
}

SaveTextToFile(text) {
    global CFG
    dest := CFG["ClipboardSavesFolder"] "\clipboard_" TimeStamp() ".txt"
    FileAppend(text, dest, "UTF-8")
    Toast("Text saved:`n" dest)
}


; ---------------------------------------------------------------------
;  10. Open capture folder
; ---------------------------------------------------------------------
OpenCaptureFolder() {
    global CFG
    Run('explorer.exe "' CFG["BaseFolder"] '"')
}


; =====================================================================
;  Shared helpers
; =====================================================================
OpenURL(url) {
    if (url = "") {
        Toast("No URL set for that item (check config.ini).")
        return
    }
    Run(url)
}

TimeStamp() {
    return FormatTime(A_Now, "yyyy-MM-dd_HH-mm-ss")
}

Toast(msg) {
    ; Lightweight, non-blocking notification via the tray icon.
    TrayTip(msg, "JP Capture Button", 0x1)
    SetTimer(() => TrayTip(), -2500)
}

PrettyHotkey(hk) {
    out := hk
    out := StrReplace(out, "^", "Ctrl+")
    out := StrReplace(out, "!", "Alt+")
    out := StrReplace(out, "+", "Shift+")
    out := StrReplace(out, "#", "Win+")
    return StrUpper(SubStr(out, 1, StrLen(out)-1)) SubStr(out, StrLen(out))
}

ClipboardHasImage() {
    ; CF_BITMAP = 2, CF_DIB = 8
    return DllCall("IsClipboardFormatAvailable", "uint", 2)
        || DllCall("IsClipboardFormatAvailable", "uint", 8)
}

PowerToysRunning() {
    return ProcessExist("PowerToys.exe") || ProcessExist("PowerToys.PowerLauncher.exe")
}

; Use the bundled PowerShell helper to load an image file onto the clipboard.
ImageFileToClipboard(path) {
    helper := A_ScriptDir "\lib\ImageToClipboard.ps1"
    if !FileExist(helper) {
        Toast("Image saved (clipboard helper missing).")
        return
    }
    RunWait('powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' helper '" "' path '"', , "Hide")
}

; Save the current clipboard image to a PNG via inline PowerShell.
SaveClipboardImage(dest) {
    ps := "Add-Type -AssemblyName System.Windows.Forms;"
        . "Add-Type -AssemblyName System.Drawing;"
        . "$img=[System.Windows.Forms.Clipboard]::GetImage();"
        . "if($img){$img.Save('" dest "',[System.Drawing.Imaging.ImageFormat]::Png); exit 0} else { exit 1 }"
    exit := RunWait('powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "' ps '"', , "Hide")
    return (exit = 0 && FileExist(dest))
}
