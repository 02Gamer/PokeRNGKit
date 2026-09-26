// SPDX-License-Identifier: GPL-3.0-or-later
// Static bindings to PKHeX 26.08.26 IRibbonSet interfaces; tested against RibbonInfo.
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal static partial class PokemonRibbons
{
    private sealed record Field(string Key, int Max, Func<int> Read, Action<int> Write);
    private static List<Field> Fields(PKM p)
    {
        List<Field> fields = [];
        if (p is IRibbonSetCommon3 r0)
        {
            fields.Add(new("RibbonChampionG3", 1, () => r0.RibbonChampionG3 ? 1 : 0, value => r0.RibbonChampionG3 = value != 0));
            fields.Add(new("RibbonArtist", 1, () => r0.RibbonArtist ? 1 : 0, value => r0.RibbonArtist = value != 0));
            fields.Add(new("RibbonEffort", 1, () => r0.RibbonEffort ? 1 : 0, value => r0.RibbonEffort = value != 0));
        }
        if (p is IRibbonSetCommon4 r1)
        {
            fields.Add(new("RibbonChampionSinnoh", 1, () => r1.RibbonChampionSinnoh ? 1 : 0, value => r1.RibbonChampionSinnoh = value != 0));
            fields.Add(new("RibbonAlert", 1, () => r1.RibbonAlert ? 1 : 0, value => r1.RibbonAlert = value != 0));
            fields.Add(new("RibbonShock", 1, () => r1.RibbonShock ? 1 : 0, value => r1.RibbonShock = value != 0));
            fields.Add(new("RibbonDowncast", 1, () => r1.RibbonDowncast ? 1 : 0, value => r1.RibbonDowncast = value != 0));
            fields.Add(new("RibbonCareless", 1, () => r1.RibbonCareless ? 1 : 0, value => r1.RibbonCareless = value != 0));
            fields.Add(new("RibbonRelax", 1, () => r1.RibbonRelax ? 1 : 0, value => r1.RibbonRelax = value != 0));
            fields.Add(new("RibbonSnooze", 1, () => r1.RibbonSnooze ? 1 : 0, value => r1.RibbonSnooze = value != 0));
            fields.Add(new("RibbonSmile", 1, () => r1.RibbonSmile ? 1 : 0, value => r1.RibbonSmile = value != 0));
            fields.Add(new("RibbonGorgeous", 1, () => r1.RibbonGorgeous ? 1 : 0, value => r1.RibbonGorgeous = value != 0));
            fields.Add(new("RibbonRoyal", 1, () => r1.RibbonRoyal ? 1 : 0, value => r1.RibbonRoyal = value != 0));
            fields.Add(new("RibbonGorgeousRoyal", 1, () => r1.RibbonGorgeousRoyal ? 1 : 0, value => r1.RibbonGorgeousRoyal = value != 0));
            fields.Add(new("RibbonFootprint", 1, () => r1.RibbonFootprint ? 1 : 0, value => r1.RibbonFootprint = value != 0));
            fields.Add(new("RibbonRecord", 1, () => r1.RibbonRecord ? 1 : 0, value => r1.RibbonRecord = value != 0));
            fields.Add(new("RibbonLegend", 1, () => r1.RibbonLegend ? 1 : 0, value => r1.RibbonLegend = value != 0));
        }
        if (p is IRibbonSetCommon6 r2)
        {
            fields.Add(new("RibbonChampionKalos", 1, () => r2.RibbonChampionKalos ? 1 : 0, value => r2.RibbonChampionKalos = value != 0));
            fields.Add(new("RibbonChampionG6Hoenn", 1, () => r2.RibbonChampionG6Hoenn ? 1 : 0, value => r2.RibbonChampionG6Hoenn = value != 0));
            fields.Add(new("RibbonBestFriends", 1, () => r2.RibbonBestFriends ? 1 : 0, value => r2.RibbonBestFriends = value != 0));
            fields.Add(new("RibbonTraining", 1, () => r2.RibbonTraining ? 1 : 0, value => r2.RibbonTraining = value != 0));
            fields.Add(new("RibbonBattlerSkillful", 1, () => r2.RibbonBattlerSkillful ? 1 : 0, value => r2.RibbonBattlerSkillful = value != 0));
            fields.Add(new("RibbonBattlerExpert", 1, () => r2.RibbonBattlerExpert ? 1 : 0, value => r2.RibbonBattlerExpert = value != 0));
            fields.Add(new("RibbonContestStar", 1, () => r2.RibbonContestStar ? 1 : 0, value => r2.RibbonContestStar = value != 0));
            fields.Add(new("RibbonMasterCoolness", 1, () => r2.RibbonMasterCoolness ? 1 : 0, value => r2.RibbonMasterCoolness = value != 0));
            fields.Add(new("RibbonMasterBeauty", 1, () => r2.RibbonMasterBeauty ? 1 : 0, value => r2.RibbonMasterBeauty = value != 0));
            fields.Add(new("RibbonMasterCuteness", 1, () => r2.RibbonMasterCuteness ? 1 : 0, value => r2.RibbonMasterCuteness = value != 0));
            fields.Add(new("RibbonMasterCleverness", 1, () => r2.RibbonMasterCleverness ? 1 : 0, value => r2.RibbonMasterCleverness = value != 0));
            fields.Add(new("RibbonMasterToughness", 1, () => r2.RibbonMasterToughness ? 1 : 0, value => r2.RibbonMasterToughness = value != 0));
        }
        if (p is IRibbonSetCommon7 r3)
        {
            fields.Add(new("RibbonChampionAlola", 1, () => r3.RibbonChampionAlola ? 1 : 0, value => r3.RibbonChampionAlola = value != 0));
            fields.Add(new("RibbonBattleRoyale", 1, () => r3.RibbonBattleRoyale ? 1 : 0, value => r3.RibbonBattleRoyale = value != 0));
            fields.Add(new("RibbonBattleTreeGreat", 1, () => r3.RibbonBattleTreeGreat ? 1 : 0, value => r3.RibbonBattleTreeGreat = value != 0));
            fields.Add(new("RibbonBattleTreeMaster", 1, () => r3.RibbonBattleTreeMaster ? 1 : 0, value => r3.RibbonBattleTreeMaster = value != 0));
        }
        if (p is IRibbonSetCommon8 r4)
        {
            fields.Add(new("RibbonChampionGalar", 1, () => r4.RibbonChampionGalar ? 1 : 0, value => r4.RibbonChampionGalar = value != 0));
            fields.Add(new("RibbonTowerMaster", 1, () => r4.RibbonTowerMaster ? 1 : 0, value => r4.RibbonTowerMaster = value != 0));
            fields.Add(new("RibbonMasterRank", 1, () => r4.RibbonMasterRank ? 1 : 0, value => r4.RibbonMasterRank = value != 0));
            fields.Add(new("RibbonTwinklingStar", 1, () => r4.RibbonTwinklingStar ? 1 : 0, value => r4.RibbonTwinklingStar = value != 0));
            fields.Add(new("RibbonHisui", 1, () => r4.RibbonHisui ? 1 : 0, value => r4.RibbonHisui = value != 0));
        }
        if (p is IRibbonSetCommon9 r5)
        {
            fields.Add(new("RibbonChampionPaldea", 1, () => r5.RibbonChampionPaldea ? 1 : 0, value => r5.RibbonChampionPaldea = value != 0));
            fields.Add(new("RibbonOnceInALifetime", 1, () => r5.RibbonOnceInALifetime ? 1 : 0, value => r5.RibbonOnceInALifetime = value != 0));
            fields.Add(new("RibbonPartner", 1, () => r5.RibbonPartner ? 1 : 0, value => r5.RibbonPartner = value != 0));
        }
        if (p is IRibbonSetEvent3 r6)
        {
            fields.Add(new("RibbonEarth", 1, () => r6.RibbonEarth ? 1 : 0, value => r6.RibbonEarth = value != 0));
            fields.Add(new("RibbonNational", 1, () => r6.RibbonNational ? 1 : 0, value => r6.RibbonNational = value != 0));
            fields.Add(new("RibbonCountry", 1, () => r6.RibbonCountry ? 1 : 0, value => r6.RibbonCountry = value != 0));
            fields.Add(new("RibbonChampionBattle", 1, () => r6.RibbonChampionBattle ? 1 : 0, value => r6.RibbonChampionBattle = value != 0));
            fields.Add(new("RibbonChampionRegional", 1, () => r6.RibbonChampionRegional ? 1 : 0, value => r6.RibbonChampionRegional = value != 0));
            fields.Add(new("RibbonChampionNational", 1, () => r6.RibbonChampionNational ? 1 : 0, value => r6.RibbonChampionNational = value != 0));
        }
        if (p is IRibbonSetEvent4 r7)
        {
            fields.Add(new("RibbonClassic", 1, () => r7.RibbonClassic ? 1 : 0, value => r7.RibbonClassic = value != 0));
            fields.Add(new("RibbonWishing", 1, () => r7.RibbonWishing ? 1 : 0, value => r7.RibbonWishing = value != 0));
            fields.Add(new("RibbonPremier", 1, () => r7.RibbonPremier ? 1 : 0, value => r7.RibbonPremier = value != 0));
            fields.Add(new("RibbonEvent", 1, () => r7.RibbonEvent ? 1 : 0, value => r7.RibbonEvent = value != 0));
            fields.Add(new("RibbonBirthday", 1, () => r7.RibbonBirthday ? 1 : 0, value => r7.RibbonBirthday = value != 0));
            fields.Add(new("RibbonSpecial", 1, () => r7.RibbonSpecial ? 1 : 0, value => r7.RibbonSpecial = value != 0));
            fields.Add(new("RibbonWorld", 1, () => r7.RibbonWorld ? 1 : 0, value => r7.RibbonWorld = value != 0));
            fields.Add(new("RibbonChampionWorld", 1, () => r7.RibbonChampionWorld ? 1 : 0, value => r7.RibbonChampionWorld = value != 0));
            fields.Add(new("RibbonSouvenir", 1, () => r7.RibbonSouvenir ? 1 : 0, value => r7.RibbonSouvenir = value != 0));
        }
        if (p is IRibbonSetMark8 r8)
        {
            fields.Add(new("RibbonMarkLunchtime", 1, () => r8.RibbonMarkLunchtime ? 1 : 0, value => r8.RibbonMarkLunchtime = value != 0));
            fields.Add(new("RibbonMarkSleepyTime", 1, () => r8.RibbonMarkSleepyTime ? 1 : 0, value => r8.RibbonMarkSleepyTime = value != 0));
            fields.Add(new("RibbonMarkDusk", 1, () => r8.RibbonMarkDusk ? 1 : 0, value => r8.RibbonMarkDusk = value != 0));
            fields.Add(new("RibbonMarkDawn", 1, () => r8.RibbonMarkDawn ? 1 : 0, value => r8.RibbonMarkDawn = value != 0));
            fields.Add(new("RibbonMarkCloudy", 1, () => r8.RibbonMarkCloudy ? 1 : 0, value => r8.RibbonMarkCloudy = value != 0));
            fields.Add(new("RibbonMarkRainy", 1, () => r8.RibbonMarkRainy ? 1 : 0, value => r8.RibbonMarkRainy = value != 0));
            fields.Add(new("RibbonMarkStormy", 1, () => r8.RibbonMarkStormy ? 1 : 0, value => r8.RibbonMarkStormy = value != 0));
            fields.Add(new("RibbonMarkSnowy", 1, () => r8.RibbonMarkSnowy ? 1 : 0, value => r8.RibbonMarkSnowy = value != 0));
            fields.Add(new("RibbonMarkBlizzard", 1, () => r8.RibbonMarkBlizzard ? 1 : 0, value => r8.RibbonMarkBlizzard = value != 0));
            fields.Add(new("RibbonMarkDry", 1, () => r8.RibbonMarkDry ? 1 : 0, value => r8.RibbonMarkDry = value != 0));
            fields.Add(new("RibbonMarkSandstorm", 1, () => r8.RibbonMarkSandstorm ? 1 : 0, value => r8.RibbonMarkSandstorm = value != 0));
            fields.Add(new("RibbonMarkMisty", 1, () => r8.RibbonMarkMisty ? 1 : 0, value => r8.RibbonMarkMisty = value != 0));
            fields.Add(new("RibbonMarkDestiny", 1, () => r8.RibbonMarkDestiny ? 1 : 0, value => r8.RibbonMarkDestiny = value != 0));
            fields.Add(new("RibbonMarkFishing", 1, () => r8.RibbonMarkFishing ? 1 : 0, value => r8.RibbonMarkFishing = value != 0));
            fields.Add(new("RibbonMarkCurry", 1, () => r8.RibbonMarkCurry ? 1 : 0, value => r8.RibbonMarkCurry = value != 0));
            fields.Add(new("RibbonMarkUncommon", 1, () => r8.RibbonMarkUncommon ? 1 : 0, value => r8.RibbonMarkUncommon = value != 0));
            fields.Add(new("RibbonMarkRare", 1, () => r8.RibbonMarkRare ? 1 : 0, value => r8.RibbonMarkRare = value != 0));
            fields.Add(new("RibbonMarkRowdy", 1, () => r8.RibbonMarkRowdy ? 1 : 0, value => r8.RibbonMarkRowdy = value != 0));
            fields.Add(new("RibbonMarkAbsentMinded", 1, () => r8.RibbonMarkAbsentMinded ? 1 : 0, value => r8.RibbonMarkAbsentMinded = value != 0));
            fields.Add(new("RibbonMarkJittery", 1, () => r8.RibbonMarkJittery ? 1 : 0, value => r8.RibbonMarkJittery = value != 0));
            fields.Add(new("RibbonMarkExcited", 1, () => r8.RibbonMarkExcited ? 1 : 0, value => r8.RibbonMarkExcited = value != 0));
            fields.Add(new("RibbonMarkCharismatic", 1, () => r8.RibbonMarkCharismatic ? 1 : 0, value => r8.RibbonMarkCharismatic = value != 0));
            fields.Add(new("RibbonMarkCalmness", 1, () => r8.RibbonMarkCalmness ? 1 : 0, value => r8.RibbonMarkCalmness = value != 0));
            fields.Add(new("RibbonMarkIntense", 1, () => r8.RibbonMarkIntense ? 1 : 0, value => r8.RibbonMarkIntense = value != 0));
            fields.Add(new("RibbonMarkZonedOut", 1, () => r8.RibbonMarkZonedOut ? 1 : 0, value => r8.RibbonMarkZonedOut = value != 0));
            fields.Add(new("RibbonMarkJoyful", 1, () => r8.RibbonMarkJoyful ? 1 : 0, value => r8.RibbonMarkJoyful = value != 0));
            fields.Add(new("RibbonMarkAngry", 1, () => r8.RibbonMarkAngry ? 1 : 0, value => r8.RibbonMarkAngry = value != 0));
            fields.Add(new("RibbonMarkSmiley", 1, () => r8.RibbonMarkSmiley ? 1 : 0, value => r8.RibbonMarkSmiley = value != 0));
            fields.Add(new("RibbonMarkTeary", 1, () => r8.RibbonMarkTeary ? 1 : 0, value => r8.RibbonMarkTeary = value != 0));
            fields.Add(new("RibbonMarkUpbeat", 1, () => r8.RibbonMarkUpbeat ? 1 : 0, value => r8.RibbonMarkUpbeat = value != 0));
            fields.Add(new("RibbonMarkPeeved", 1, () => r8.RibbonMarkPeeved ? 1 : 0, value => r8.RibbonMarkPeeved = value != 0));
            fields.Add(new("RibbonMarkIntellectual", 1, () => r8.RibbonMarkIntellectual ? 1 : 0, value => r8.RibbonMarkIntellectual = value != 0));
            fields.Add(new("RibbonMarkFerocious", 1, () => r8.RibbonMarkFerocious ? 1 : 0, value => r8.RibbonMarkFerocious = value != 0));
            fields.Add(new("RibbonMarkCrafty", 1, () => r8.RibbonMarkCrafty ? 1 : 0, value => r8.RibbonMarkCrafty = value != 0));
            fields.Add(new("RibbonMarkScowling", 1, () => r8.RibbonMarkScowling ? 1 : 0, value => r8.RibbonMarkScowling = value != 0));
            fields.Add(new("RibbonMarkKindly", 1, () => r8.RibbonMarkKindly ? 1 : 0, value => r8.RibbonMarkKindly = value != 0));
            fields.Add(new("RibbonMarkFlustered", 1, () => r8.RibbonMarkFlustered ? 1 : 0, value => r8.RibbonMarkFlustered = value != 0));
            fields.Add(new("RibbonMarkPumpedUp", 1, () => r8.RibbonMarkPumpedUp ? 1 : 0, value => r8.RibbonMarkPumpedUp = value != 0));
            fields.Add(new("RibbonMarkZeroEnergy", 1, () => r8.RibbonMarkZeroEnergy ? 1 : 0, value => r8.RibbonMarkZeroEnergy = value != 0));
            fields.Add(new("RibbonMarkPrideful", 1, () => r8.RibbonMarkPrideful ? 1 : 0, value => r8.RibbonMarkPrideful = value != 0));
            fields.Add(new("RibbonMarkUnsure", 1, () => r8.RibbonMarkUnsure ? 1 : 0, value => r8.RibbonMarkUnsure = value != 0));
            fields.Add(new("RibbonMarkHumble", 1, () => r8.RibbonMarkHumble ? 1 : 0, value => r8.RibbonMarkHumble = value != 0));
            fields.Add(new("RibbonMarkThorny", 1, () => r8.RibbonMarkThorny ? 1 : 0, value => r8.RibbonMarkThorny = value != 0));
            fields.Add(new("RibbonMarkVigor", 1, () => r8.RibbonMarkVigor ? 1 : 0, value => r8.RibbonMarkVigor = value != 0));
            fields.Add(new("RibbonMarkSlump", 1, () => r8.RibbonMarkSlump ? 1 : 0, value => r8.RibbonMarkSlump = value != 0));
        }
        if (p is IRibbonSetMark9 r9)
        {
            fields.Add(new("RibbonMarkJumbo", 1, () => r9.RibbonMarkJumbo ? 1 : 0, value => r9.RibbonMarkJumbo = value != 0));
            fields.Add(new("RibbonMarkMini", 1, () => r9.RibbonMarkMini ? 1 : 0, value => r9.RibbonMarkMini = value != 0));
            fields.Add(new("RibbonMarkItemfinder", 1, () => r9.RibbonMarkItemfinder ? 1 : 0, value => r9.RibbonMarkItemfinder = value != 0));
            fields.Add(new("RibbonMarkPartner", 1, () => r9.RibbonMarkPartner ? 1 : 0, value => r9.RibbonMarkPartner = value != 0));
            fields.Add(new("RibbonMarkGourmand", 1, () => r9.RibbonMarkGourmand ? 1 : 0, value => r9.RibbonMarkGourmand = value != 0));
            fields.Add(new("RibbonMarkAlpha", 1, () => r9.RibbonMarkAlpha ? 1 : 0, value => r9.RibbonMarkAlpha = value != 0));
            fields.Add(new("RibbonMarkMightiest", 1, () => r9.RibbonMarkMightiest ? 1 : 0, value => r9.RibbonMarkMightiest = value != 0));
            fields.Add(new("RibbonMarkTitan", 1, () => r9.RibbonMarkTitan ? 1 : 0, value => r9.RibbonMarkTitan = value != 0));
        }
        if (p is IRibbonSetMemory6 r10)
        {
            fields.Add(new("RibbonCountMemoryContest", 40, () => r10.RibbonCountMemoryContest, value => r10.RibbonCountMemoryContest = (byte)value));
            fields.Add(new("RibbonCountMemoryBattle", 8, () => r10.RibbonCountMemoryBattle, value => r10.RibbonCountMemoryBattle = (byte)value));
        }
        if (p is IRibbonSetOnly3 r11)
        {
            fields.Add(new("RibbonCountG3Cool", 4, () => r11.RibbonCountG3Cool, value => r11.RibbonCountG3Cool = (byte)value));
            fields.Add(new("RibbonCountG3Beauty", 4, () => r11.RibbonCountG3Beauty, value => r11.RibbonCountG3Beauty = (byte)value));
            fields.Add(new("RibbonCountG3Cute", 4, () => r11.RibbonCountG3Cute, value => r11.RibbonCountG3Cute = (byte)value));
            fields.Add(new("RibbonCountG3Smart", 4, () => r11.RibbonCountG3Smart, value => r11.RibbonCountG3Smart = (byte)value));
            fields.Add(new("RibbonCountG3Tough", 4, () => r11.RibbonCountG3Tough, value => r11.RibbonCountG3Tough = (byte)value));
            fields.Add(new("RibbonWorld", 1, () => r11.RibbonWorld ? 1 : 0, value => r11.RibbonWorld = value != 0));
        }
        if (p is IRibbonSetUnique3 r12)
        {
            fields.Add(new("RibbonWinning", 1, () => r12.RibbonWinning ? 1 : 0, value => r12.RibbonWinning = value != 0));
            fields.Add(new("RibbonVictory", 1, () => r12.RibbonVictory ? 1 : 0, value => r12.RibbonVictory = value != 0));
        }
        if (p is IRibbonSetUnique4 r13)
        {
            fields.Add(new("RibbonAbility", 1, () => r13.RibbonAbility ? 1 : 0, value => r13.RibbonAbility = value != 0));
            fields.Add(new("RibbonAbilityGreat", 1, () => r13.RibbonAbilityGreat ? 1 : 0, value => r13.RibbonAbilityGreat = value != 0));
            fields.Add(new("RibbonAbilityDouble", 1, () => r13.RibbonAbilityDouble ? 1 : 0, value => r13.RibbonAbilityDouble = value != 0));
            fields.Add(new("RibbonAbilityMulti", 1, () => r13.RibbonAbilityMulti ? 1 : 0, value => r13.RibbonAbilityMulti = value != 0));
            fields.Add(new("RibbonAbilityPair", 1, () => r13.RibbonAbilityPair ? 1 : 0, value => r13.RibbonAbilityPair = value != 0));
            fields.Add(new("RibbonAbilityWorld", 1, () => r13.RibbonAbilityWorld ? 1 : 0, value => r13.RibbonAbilityWorld = value != 0));
            fields.Add(new("RibbonG3Cool", 1, () => r13.RibbonG3Cool ? 1 : 0, value => r13.RibbonG3Cool = value != 0));
            fields.Add(new("RibbonG3CoolSuper", 1, () => r13.RibbonG3CoolSuper ? 1 : 0, value => r13.RibbonG3CoolSuper = value != 0));
            fields.Add(new("RibbonG3CoolHyper", 1, () => r13.RibbonG3CoolHyper ? 1 : 0, value => r13.RibbonG3CoolHyper = value != 0));
            fields.Add(new("RibbonG3CoolMaster", 1, () => r13.RibbonG3CoolMaster ? 1 : 0, value => r13.RibbonG3CoolMaster = value != 0));
            fields.Add(new("RibbonG3Beauty", 1, () => r13.RibbonG3Beauty ? 1 : 0, value => r13.RibbonG3Beauty = value != 0));
            fields.Add(new("RibbonG3BeautySuper", 1, () => r13.RibbonG3BeautySuper ? 1 : 0, value => r13.RibbonG3BeautySuper = value != 0));
            fields.Add(new("RibbonG3BeautyHyper", 1, () => r13.RibbonG3BeautyHyper ? 1 : 0, value => r13.RibbonG3BeautyHyper = value != 0));
            fields.Add(new("RibbonG3BeautyMaster", 1, () => r13.RibbonG3BeautyMaster ? 1 : 0, value => r13.RibbonG3BeautyMaster = value != 0));
            fields.Add(new("RibbonG3Cute", 1, () => r13.RibbonG3Cute ? 1 : 0, value => r13.RibbonG3Cute = value != 0));
            fields.Add(new("RibbonG3CuteSuper", 1, () => r13.RibbonG3CuteSuper ? 1 : 0, value => r13.RibbonG3CuteSuper = value != 0));
            fields.Add(new("RibbonG3CuteHyper", 1, () => r13.RibbonG3CuteHyper ? 1 : 0, value => r13.RibbonG3CuteHyper = value != 0));
            fields.Add(new("RibbonG3CuteMaster", 1, () => r13.RibbonG3CuteMaster ? 1 : 0, value => r13.RibbonG3CuteMaster = value != 0));
            fields.Add(new("RibbonG3Smart", 1, () => r13.RibbonG3Smart ? 1 : 0, value => r13.RibbonG3Smart = value != 0));
            fields.Add(new("RibbonG3SmartSuper", 1, () => r13.RibbonG3SmartSuper ? 1 : 0, value => r13.RibbonG3SmartSuper = value != 0));
            fields.Add(new("RibbonG3SmartHyper", 1, () => r13.RibbonG3SmartHyper ? 1 : 0, value => r13.RibbonG3SmartHyper = value != 0));
            fields.Add(new("RibbonG3SmartMaster", 1, () => r13.RibbonG3SmartMaster ? 1 : 0, value => r13.RibbonG3SmartMaster = value != 0));
            fields.Add(new("RibbonG3Tough", 1, () => r13.RibbonG3Tough ? 1 : 0, value => r13.RibbonG3Tough = value != 0));
            fields.Add(new("RibbonG3ToughSuper", 1, () => r13.RibbonG3ToughSuper ? 1 : 0, value => r13.RibbonG3ToughSuper = value != 0));
            fields.Add(new("RibbonG3ToughHyper", 1, () => r13.RibbonG3ToughHyper ? 1 : 0, value => r13.RibbonG3ToughHyper = value != 0));
            fields.Add(new("RibbonG3ToughMaster", 1, () => r13.RibbonG3ToughMaster ? 1 : 0, value => r13.RibbonG3ToughMaster = value != 0));
            fields.Add(new("RibbonG4Cool", 1, () => r13.RibbonG4Cool ? 1 : 0, value => r13.RibbonG4Cool = value != 0));
            fields.Add(new("RibbonG4CoolGreat", 1, () => r13.RibbonG4CoolGreat ? 1 : 0, value => r13.RibbonG4CoolGreat = value != 0));
            fields.Add(new("RibbonG4CoolUltra", 1, () => r13.RibbonG4CoolUltra ? 1 : 0, value => r13.RibbonG4CoolUltra = value != 0));
            fields.Add(new("RibbonG4CoolMaster", 1, () => r13.RibbonG4CoolMaster ? 1 : 0, value => r13.RibbonG4CoolMaster = value != 0));
            fields.Add(new("RibbonG4Beauty", 1, () => r13.RibbonG4Beauty ? 1 : 0, value => r13.RibbonG4Beauty = value != 0));
            fields.Add(new("RibbonG4BeautyGreat", 1, () => r13.RibbonG4BeautyGreat ? 1 : 0, value => r13.RibbonG4BeautyGreat = value != 0));
            fields.Add(new("RibbonG4BeautyUltra", 1, () => r13.RibbonG4BeautyUltra ? 1 : 0, value => r13.RibbonG4BeautyUltra = value != 0));
            fields.Add(new("RibbonG4BeautyMaster", 1, () => r13.RibbonG4BeautyMaster ? 1 : 0, value => r13.RibbonG4BeautyMaster = value != 0));
            fields.Add(new("RibbonG4Cute", 1, () => r13.RibbonG4Cute ? 1 : 0, value => r13.RibbonG4Cute = value != 0));
            fields.Add(new("RibbonG4CuteGreat", 1, () => r13.RibbonG4CuteGreat ? 1 : 0, value => r13.RibbonG4CuteGreat = value != 0));
            fields.Add(new("RibbonG4CuteUltra", 1, () => r13.RibbonG4CuteUltra ? 1 : 0, value => r13.RibbonG4CuteUltra = value != 0));
            fields.Add(new("RibbonG4CuteMaster", 1, () => r13.RibbonG4CuteMaster ? 1 : 0, value => r13.RibbonG4CuteMaster = value != 0));
            fields.Add(new("RibbonG4Smart", 1, () => r13.RibbonG4Smart ? 1 : 0, value => r13.RibbonG4Smart = value != 0));
            fields.Add(new("RibbonG4SmartGreat", 1, () => r13.RibbonG4SmartGreat ? 1 : 0, value => r13.RibbonG4SmartGreat = value != 0));
            fields.Add(new("RibbonG4SmartUltra", 1, () => r13.RibbonG4SmartUltra ? 1 : 0, value => r13.RibbonG4SmartUltra = value != 0));
            fields.Add(new("RibbonG4SmartMaster", 1, () => r13.RibbonG4SmartMaster ? 1 : 0, value => r13.RibbonG4SmartMaster = value != 0));
            fields.Add(new("RibbonG4Tough", 1, () => r13.RibbonG4Tough ? 1 : 0, value => r13.RibbonG4Tough = value != 0));
            fields.Add(new("RibbonG4ToughGreat", 1, () => r13.RibbonG4ToughGreat ? 1 : 0, value => r13.RibbonG4ToughGreat = value != 0));
            fields.Add(new("RibbonG4ToughUltra", 1, () => r13.RibbonG4ToughUltra ? 1 : 0, value => r13.RibbonG4ToughUltra = value != 0));
            fields.Add(new("RibbonG4ToughMaster", 1, () => r13.RibbonG4ToughMaster ? 1 : 0, value => r13.RibbonG4ToughMaster = value != 0));
        }
        return fields;
    }
}
