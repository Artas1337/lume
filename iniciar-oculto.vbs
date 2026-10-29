' Inicia o Lume sem janela de terminal.
' Usa o Node da pasta "node" (versão instalada) ou, se não existir, o Node do sistema.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir
node = "node"
If fso.FileExists(dir & "\node\node.exe") Then node = """" & dir & "\node\node.exe"""
sh.Run node & " server.js", 0, False
