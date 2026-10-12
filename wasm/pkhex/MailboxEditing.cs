// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json.Serialization;

namespace PokeRNGKit.SaveEditor;

public sealed record MailboxEntry([property:JsonRequired]int Index,[property:JsonRequired]bool Held,[property:JsonRequired]bool? Empty,[property:JsonRequired]string AuthorName,[property:JsonRequired]ushort Tid,[property:JsonRequired]ushort Sid,[property:JsonRequired]byte Language,[property:JsonRequired]byte Version,[property:JsonRequired]byte Gender,[property:JsonRequired]int Type,[property:JsonRequired]ushort Species,[property:JsonRequired]ushort[] Appear,[property:JsonRequired]ushort[] Message,[property:JsonRequired]string[] Lines,[property:JsonRequired]bool UserEntered,[property:JsonRequired]ushort[] Misc,[property:JsonRequired]ushort Ending);
public sealed record MailboxParty(int Index, PokemonEntry Pokemon, int HeldMailId, bool ItemIsMail);
public sealed record MailboxCatalog(bool CanEdit, string SourceHash, byte Generation, int HeldCount, int BoxCount, int BoxMaximum, MailboxEntry[] Entries, MailboxParty[] Party, OriginChoice[] Types, OriginChoice[] Species, OriginChoice[] Languages, OriginChoice[] Versions, string[] Issues);
public sealed record MailboxAction([property: JsonRequired] string Kind, [property: JsonRequired] int Index, MailboxEntry? Entry = null, int? Value = null, bool? ModifyHeldItem = null);

internal sealed class MailboxEditing
{
    internal static (byte[] Output, string[] Issues) Prepare(byte[] original, MailboxAction[] actions)
    {
        var source=SaveUtil.GetSaveFile(original.ToArray())??throw new ArgumentException("Mailbox save is unrecognized.");
        var model=new MailboxEditing(source);model.Apply(actions);model.Save();
        var expected=new MailboxEditing(source).Read("");
        var issues=model.Issues();var output=source.Write().ToArray();
        var reopened=SaveUtil.GetSaveFile(output.ToArray());
        if(reopened is null||reopened.GetType()!=source.GetType()||!SaveChecksums.Valid(reopened))throw new InvalidOperationException("Mailbox export verification failed.");
        var actual=new MailboxEditing(reopened).Read("");
        if(expected.BoxCount!=actual.BoxCount||expected.Entries.Length!=actual.Entries.Length||!expected.Entries.Zip(actual.Entries).All(pair=>EntryEqual(pair.First,pair.Second)))throw new InvalidOperationException("Mailbox persisted fields verification failed.");
        return(output,issues);
    }
    private static bool EntryEqual(MailboxEntry a,MailboxEntry b)=>a.Index==b.Index&&a.Held==b.Held&&a.Empty==b.Empty&&a.AuthorName==b.AuthorName&&a.Tid==b.Tid&&a.Sid==b.Sid&&a.Language==b.Language&&a.Version==b.Version&&a.Gender==b.Gender&&a.Type==b.Type&&a.Species==b.Species&&a.UserEntered==b.UserEntered&&a.Ending==b.Ending&&a.Appear.SequenceEqual(b.Appear)&&a.Message.SequenceEqual(b.Message)&&a.Lines.SequenceEqual(b.Lines)&&a.Misc.SequenceEqual(b.Misc);
    private readonly SaveFile save;
    private readonly IList<PKM> party;
    private readonly MailDetail[] mail;
    private readonly int[] items;
    private readonly byte resetLanguage, resetVersion;
    private readonly int heldCount, boxMaximum;
    private int boxCount;
    internal static bool Supports(SaveFile s) => s is SAV2 or SAV2Stadium or SAV3 or SAV4DP or SAV4Pt or SAV4HGSS or SAV5;
    internal MailboxEditing(SaveFile source)
    {
        if (!Supports(source)) throw new ArgumentException("Mailbox is unsupported for this save.");
        save = source; party = source is SAV2Stadium ? new List<PKM>() : source.PartyData;
        switch(source)
        {
            case SAV2 s:
                heldCount=6; boxMaximum=10; mail=Enumerable.Range(0,16).Select(i=>(MailDetail)new Mail2(s,i)).ToArray();
                boxCount=Math.Min(boxMaximum,s.Data[Mail2.GetMailboxOffset(s.Language)]); break;
            case SAV2Stadium s:
                heldCount=30; boxMaximum=50; mail=Enumerable.Range(0,80).Select(i=>(MailDetail)new Mail2(s,i)).ToArray();
                boxCount=Math.Min(boxMaximum,s.Data[Mail2.GetMailboxOffsetStadium2(s.Language)]); break;
            case SAV3 s:
                heldCount=6; boxMaximum=boxCount=10; mail=Enumerable.Range(0,16).Select(i=>(MailDetail)s.LargeBlock.GetMail(i)).ToArray(); break;
            case SAV4 s:
                heldCount=party.Count; boxMaximum=boxCount=20; mail=party.Select(p=>(MailDetail)new Mail4(((PK4)p).HeldMail.ToArray())).Concat(Enumerable.Range(0,20).Select(i=>s.GetMail(i))).ToArray(); break;
            case SAV5 s:
                heldCount=party.Count; boxMaximum=boxCount=20; mail=party.Select(p=>(MailDetail)new Mail5(((PK5)p).HeldMail.ToArray())).Concat(Enumerable.Range(0,20).Select(i=>s.GetMail(i))).ToArray(); break;
            default: throw new ArgumentException("Mailbox is unsupported for this save.");
        }
        items=source.Generation switch {2=>[158,181,182,183,184,185,186,187,188,189],3=>Enumerable.Range(121,12).ToArray(),_=>Enumerable.Range(137,12).ToArray()};
        resetLanguage=mail[^1].AuthorLanguage;resetVersion=mail[^1].AuthorVersion;
    }
    private static OriginChoice[] Choices(SaveFile s, Func<FilteredGameDataSource,IEnumerable<ComboItem>> get)
    {
        var sources=new[]{"zh-Hans","en","ja"}.Select(l=>new FilteredGameDataSource(s,new GameDataSource(GameInfo.GetStrings(l)))).ToArray();
        var values=sources.Select(x=>get(x).GroupBy(v=>v.Value).ToDictionary(g=>g.Key,g=>g.First().Text)).ToArray();
        return values[1].Select(v=>new OriginChoice(v.Key,new(values[0].GetValueOrDefault(v.Key,v.Value),v.Value,values[2].GetValueOrDefault(v.Key,v.Value)))).ToArray();
    }
    internal MailboxCatalog Read(string hash)
    {
        var strings=new[]{"zh-Hans","en","ja"}.Select(l=>GameInfo.GetStrings(l)).ToArray();
        var itemStrings=strings.Select(s=>s.GetItemStrings(save.Context,save.Version)).ToArray();
        var types=new[]{0}.Concat(items).Select((id,index)=>new OriginChoice(index,new(itemStrings[0][id],itemStrings[1][id],itemStrings[2][id]))).ToArray();
        var languages=GameInfo.LanguageDataSource(save.Generation,save.Context).Select(v=>new OriginChoice(v.Value,new(strings[0].languageNames[v.Value],strings[1].languageNames[v.Value],strings[2].languageNames[v.Value]))).ToArray();
        return new(save.State.Exportable&&SaveChecksums.Valid(save),hash,save.Generation,heldCount,boxCount,boxMaximum,
            mail.Select(ReadEntry).ToArray(),party.Select((p,i)=>new MailboxParty(i,PokemonReader.Read(p.Clone(),-1,i),p is PK3 p3?p3.HeldMailID:i,items.Contains(p.HeldItem))).ToArray(),
            types,Choices(save,s=>s.Species),languages,Choices(save,s=>s.Source.VersionDataSource.Where(v=>((GameVersion)v.Value).Context==save.Context)),Issues());
    }
    private MailboxEntry ReadEntry(MailDetail m,int index)
    {
        // Mail2 EnglishGS decoding mutates its own detached buffer. Read a fresh
        // wrapper for catalogs so repeated inspection cannot alter saved bytes.
        MailDetail r = m;
        if(save is SAV2 or SAV2Stadium)
        {
            SaveFile detached=save is SAV2 s?new SAV2(s.Data.ToArray(),(LanguageID)s.Language,s.Version):new SAV2Stadium(save.Data.ToArray(),((SAV2Stadium)save).Japanese);m.CopyTo(detached);
            r=detached is SAV2 s2?new Mail2(s2,index):new Mail2((SAV2Stadium)detached,index);
        }
        int columns=save.Generation==3?3:4;
        return new(index,index<heldCount,r.IsEmpty,r.AuthorName,r.AuthorTID,r.AuthorSID,r.AuthorLanguage,r.AuthorVersion,r.AuthorGender,r.MailType,
            save.Generation==3?SpeciesConverter.GetNational3(r.AppearPKM):r.AppearPKM,
            r is Mail4 m4?Enumerable.Range(0,3).Select(i=>(ushort)Math.Max(0,m4.GetAppearSpecies(i)-7)).ToArray():[],
            save.Generation>=3?Enumerable.Range(0,3*columns).Select(i=>r.GetMessage(i/columns,i%columns)).ToArray():[],
            save.Generation==2?[r.GetMessage(false),r.GetMessage(true)]:[],r.UserEntered,
            r is Mail5 m5?Enumerable.Range(0,3).Select(i=>(ushort)m5.GetMisc(i)).ToArray():[],r is Mail5 ending?ending.MessageEnding:(ushort)0);
    }
    internal void Apply(MailboxAction[] actions)
    {
        if(!save.State.Exportable||!SaveChecksums.Valid(save)||actions is null||actions.Length>512)throw new ArgumentException("Invalid Mailbox action list.");
        foreach(var a in actions)
        {
            if(a is null)throw new ArgumentException("Invalid Mailbox action.");
            switch(a.Kind)
            {
                case "edit":
                    var e=a.Entry??throw new ArgumentException("Missing Mailbox entry.");
                    if(a.Index!=e.Index||a.Value is not null||a.ModifyHeldItem is not null)throw new ArgumentException("Invalid Mailbox edit.");
                    Edit(Target(a.Index),e);break;
                case "boxCount":
                    if(save.Generation!=2||a.Value is not {} count||count<0||count>boxMaximum||a.Entry is not null||a.ModifyHeldItem is not null)throw new ArgumentException("Invalid Mailbox size.");
                    boxCount=count;break;
                case "heldId":
                    if(save.Generation!=3||(uint)a.Index>=party.Count||a.Value is not {} id||id< -1||id>5||a.Entry is not null||a.ModifyHeldItem is not null)throw new ArgumentException("Invalid Mailbox party ID.");
                    ((PK3)party[a.Index]).HeldMailID=(sbyte)id;break;
                case "delete":
                    var m=Target(a.Index);
                    if(a.Entry is not null||a.Value is not null||a.ModifyHeldItem is null)throw new ArgumentException("Invalid Mailbox deletion.");
                    if(a.ModifyHeldItem==true&&a.Index<party.Count)
                        for(int i=0;i<party.Count;i++)if((save.Generation==3?((PK3)party[i]).HeldMailID:i)==a.Index&&items.Contains(party[i].HeldItem)){party[i].HeldItem=0;if(party[i] is PK3 pk3)pk3.HeldMailID=-1;}
                    if(m is Mail4 blank4)blank4.SetBlank(resetLanguage,resetVersion);else if(m is Mail5 blank5)blank5.SetBlank(resetLanguage,resetVersion);else m.SetBlank();break;
                case "up": case "down":
                    if(save.Generation>3||save is SAV2Stadium&&a.Index<heldCount||a.Entry is not null||a.Value is not null||a.ModifyHeldItem is not null)throw new ArgumentException("Invalid Mailbox move.");
                    Target(a.Index);int other=a.Index+(a.Kind=="down"?1:-1),start=a.Index<heldCount?0:heldCount,end=a.Index<heldCount?heldCount:heldCount+boxCount;
                    if(other<start||other>=end)throw new ArgumentException("Mailbox move is out of range.");
                    (mail[a.Index],mail[other])=(mail[other],mail[a.Index]);break;
                default:throw new ArgumentException("Unknown Mailbox action.");
            }
        }
    }
    private MailDetail Target(int index)
    {
        if((uint)index>=mail.Length||index>=heldCount+boxCount)throw new ArgumentException("Mailbox index is out of range.");
        return mail[index];
    }
    private void Edit(MailDetail m,MailboxEntry e)
    {
        if(e.AuthorName is null||e.AuthorName.Length>7)throw new ArgumentException("Invalid Mailbox author name.");
        var languages=GameInfo.LanguageDataSource(save.Generation,save.Context).Select(v=>v.Value).ToArray();
        if(!languages.Contains(e.Language))throw new ArgumentException("Invalid Mailbox author language.");
        if(save.Generation==2&&(m.AuthorLanguage==(byte)LanguageID.Japanese||m.AuthorLanguage==(byte)LanguageID.Korean)&&e.Language!=m.AuthorLanguage)throw new ArgumentException("Mailbox language is fixed for this layout.");
        if(save.Generation<=3?e.Type!=0&&!items.Contains(e.Type):e.Type!=255&&(uint)e.Type>11)throw new ArgumentException("Invalid Mailbox type.");
        var species=new FilteredGameDataSource(save,new GameDataSource(GameInfo.GetStrings("en"))).Species.Select(v=>v.Value).ToArray();
        if(save.Generation<=3&&!species.Contains(e.Species))throw new ArgumentException("Invalid Mailbox species.");
        m.AuthorName=e.AuthorName;m.AuthorTID=e.Tid;m.AuthorLanguage=e.Language;m.MailType=e.Type;
        if(save.Generation==2){if(e.Lines is not{Length:2}||e.Lines.Any(v=>v is null||v.Length>32))throw new ArgumentException("Invalid Mailbox message.");m.AppearPKM=e.Species;m.SetMessage(e.Lines[0],e.Lines[1],e.UserEntered);return;}
        int columns=save.Generation==3?3:4;if(e.Message is null||e.Message.Length!=3*columns)throw new ArgumentException("Invalid Mailbox message.");
        m.AuthorSID=e.Sid;for(int i=0;i<e.Message.Length;i++)m.SetMessage(i/columns,i%columns,e.Message[i]);
        if(save.Generation==3){m.AppearPKM=SpeciesConverter.GetInternal3(e.Species);return;}
        var versions=new GameDataSource(GameInfo.GetStrings("en")).VersionDataSource.Where(v=>((GameVersion)v.Value).Context==save.Context).Select(v=>v.Value);
        if(!versions.Contains(e.Version)||e.Gender>1)throw new ArgumentException("Invalid Mailbox author version or gender.");
        m.AuthorVersion=e.Version;m.AuthorGender=(byte)((m.AuthorGender&0xFE)|e.Gender);
        if(m is Mail4 m4){if(e.Appear is not{Length:3})throw new ArgumentException("Invalid Mailbox artwork.");for(int i=0;i<3;i++){if(!species.Contains(e.Appear[i]))throw new ArgumentException("Invalid Mailbox artwork.");m4.SetAppearSpecies(i,(ushort)(e.Appear[i]+7));}}
        else if(m is Mail5 m5){if(e.Misc is not{Length:3})throw new ArgumentException("Invalid Mailbox miscellaneous fields.");for(int i=0;i<3;i++)m5.SetMisc(i,e.Misc[i]);m5.MessageEnding=e.Ending;}
    }
    internal string[] Issues()
    {
        var issues=new List<string>();
        if(save.Generation==3){var ids=party.Cast<PK3>().Select(p=>(int)p.HeldMailID).ToArray();for(int i=0;i<party.Count;i++){int id=ids[i];if(items.Contains(party[i].HeldItem)?id<0||id>5||mail[id].IsEmpty==true:id!= -1)issues.Add($"party:{i}:mailId");}for(int i=0;i<6;i++){if(ids.Count(v=>v==i)>1)issues.Add($"mail:{i}:duplicate");if(mail[i].IsEmpty==false&&!ids.Contains(i))issues.Add($"mail:{i}:unreferenced");}}
        else if(save.Generation is 2 or 4)for(int i=0;i<party.Count;i++)if(items.Contains(party[i].HeldItem)?mail[i].IsEmpty==true:mail[i].IsEmpty==false)issues.Add($"party:{i}:type");
        for(int i=0;i<mail.Length;i++)if(mail[i].IsEmpty is null)issues.Add($"mail:{i}:type");return issues.ToArray();
    }
    internal void Save()
    {
        for(int i=0;i<mail.Length;i++)if(save.Generation==4&&i<party.Count)mail[i].CopyTo((PK4)party[i]);else if(save.Generation==5&&i<party.Count)mail[i].CopyTo((PK5)party[i]);else mail[i].CopyTo(save);
        if(save is SAV2 s){int size=Mail2.GetMailSize(s.Language),offset=0x600,length=size*6;s.Data.Slice(offset,length).CopyTo(s.Data.Slice(offset+length,length));offset+=length*2;s.Data[offset]=(byte)boxCount;length=size*10+1;s.Data.Slice(offset,length).CopyTo(s.Data.Slice(offset+length,length));}
        else if(save is SAV2Stadium stadium)stadium.Data[Mail2.GetMailboxOffsetStadium2(stadium.Language)]=(byte)boxCount;
        if(party.Count>0)save.PartyData=party;
    }
}
