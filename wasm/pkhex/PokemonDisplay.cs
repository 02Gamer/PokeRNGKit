// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal static class PokemonDisplay
{
    internal static bool Unicode=>SaveProgramSettingsRuntime.Current?.Display.Unicode??true;
    internal static IReadOnlyList<string> GenderSymbols=>Unicode?GameInfo.GenderSymbolUnicode:GameInfo.GenderSymbolASCII;
    internal static string Potential(PKM pk)=>pk.GetPotentialString(Unicode);
}
