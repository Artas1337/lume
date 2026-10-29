// Lume.exe: abre o Lume sem janela de terminal.
// Com "--volume", lê códigos de tecla do stdin e aperta as teclas de volume do Windows
// (usado pelo servidor em lib/system.js). Compilado com o csc do .NET Framework, que vem no Windows.
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;

[assembly: AssemblyTitle("Lume")]
[assembly: AssemblyDescription("Lume: o computador vira uma TV")]
[assembly: AssemblyCompany("Art Code")]
[assembly: AssemblyProduct("Lume")]
[assembly: AssemblyCopyright("Licença MIT")]

static class Lume
{
    [DllImport("user32.dll")]
    static extern void keybd_event(byte tecla, byte scan, uint flags, UIntPtr extra);

    const uint SOLTAR = 2;

    [STAThread]
    static int Main(string[] args)
    {
        if (args.Length > 0 && args[0] == "--volume") return Volume();

        string pasta = AppDomain.CurrentDomain.BaseDirectory;
        string node = Path.Combine(pasta, "node", "node.exe");
        var info = new ProcessStartInfo(File.Exists(node) ? node : "node", "server.js")
        {
            WorkingDirectory = pasta,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        try
        {
            Process.Start(info);
            return 0;
        }
        catch (Exception)
        {
            MessageBox.Show("Não consegui abrir o Lume. Reinstale pelo Lume-Instalador.exe.", "Lume",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    // Só aceita as três teclas de volume: 173 mudo, 174 abaixar, 175 aumentar
    static int Volume()
    {
        string linha;
        while ((linha = Console.In.ReadLine()) != null)
        {
            byte tecla;
            if (!byte.TryParse(linha.Trim(), out tecla) || tecla < 173 || tecla > 175) continue;
            keybd_event(tecla, 0, 0, UIntPtr.Zero);
            keybd_event(tecla, 0, SOLTAR, UIntPtr.Zero);
        }
        return 0;
    }
}
