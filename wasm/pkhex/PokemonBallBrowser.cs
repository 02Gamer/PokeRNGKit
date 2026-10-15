// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record BallBrowserChoice(int Id, LocalizedText Name, bool Legal, int StoredValue);
public sealed record BallBrowserCatalog(bool LegalFirst, int CurrentBall, int PokeBall, int ColorBall, BallBrowserChoice[] Choices);

internal static class PokemonBallBrowser
{
    internal static BallBrowserCatalog Read(PKM source)
    {
        // BallBrowser.LoadBalls uses the entity's limit, including choices that
        // fail the ball check. Never turn this presentation preference into a filter.
        var p = source.Clone();
        Span<Ball> buffer = stackalloc Ball[BallApplicator.MaxBallSpanAlloc];
        int count = BallApplicator.GetLegalBalls(buffer, p);
        var legal = buffer[..count].ToArray().Select(b => (int)b).ToHashSet();
        var names = PokemonOrigin.Localize(s => s.BallDataSource).ToDictionary(c => c.Id);
        bool legalFirst = SaveProgramSettingsRuntime.Current?.EntityEditor.ShowLegalBallsFirst ?? true;
        var choices = new List<BallBrowserChoice>();
        for (int id = 1; id <= p.MaxBallID; id++)
        {
            var probe = p.Clone();
            probe.Ball = (byte)id;
            choices.Add(new(id, names[id].Name, legal.Contains(id), probe.Ball));
        }
        if (legalFirst) choices = choices.OrderByDescending(c => c.Legal).ToList();
        var poke = p.Clone(); poke.Ball = (byte)Ball.Poke;
        var color = p.Clone(); BallApplicator.ApplyBallLegalByColor(color);
        return new(legalFirst, p.Ball, poke.Ball, color.Ball, choices.ToArray());
    }
}
