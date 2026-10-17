# PKHeX HaX 接入范围

## 2026-10-17 全局模式与相遇建议（API185，工程通过，页面待核验）

基线 `5edf994bb834b2102a6b082c68f72414ed0caa39`。增加按实际实体格式计算的共享编辑规则，统一手动特性／编号、PA9普通模式例外、LGPE／PLA持有道具及LGPE原始地区可见性；无关编辑保留原值。基础编辑与草稿准备沿相同规则，HaX身份与手动特性不再被当作隐式特性覆盖冲突。

全局HaX已关联背包目录、单项数量与批量可用状态，保留独立高级入口及实际格式回读保护；球果仍沿自己的字段范围。设置改变后，旧背包目录与请求失效。独立编辑器读取招式目录及基础编辑补传实际存档上下文，修复绑定SM目录与PB7道具上限的读写不一致。

普通模式已接当前已应用缓冲的自动状态、招式／回忆格位提示；HaX隐藏自动提示，显式分析保留，分析采用实际绑定存档的个人表。相遇建议已接入共享编辑器的冻结预览／一次确认，包含当前有效草稿，确认后更新可撤销实体缓冲；存档仍需放入与导出。HaX不提供自动建议。其他未核对主窗口事件继续保留待核对，不能据此宣称全局HaX完成。

API185模式／相遇专项与默认完整原生检查均退出0，包含真实E.sav工作副本。覆盖18种实体的两种模式、16种相遇格式的来源对照、全局背包完整文件对照、绑定SM目录／PB7道具1057、草稿合并、独立文件布局、冻结确认与来源保护。首轮PA9测试快照漏算校验和已修正，未放宽产品校验。原生证据见`.tmp/pkhex-api185-met-native-final.log`和`.tmp/pkhex-api185-native-full.log`。

完整前端361文件／2202项、Lint、类型、API185核心及最新核心网页／PWA打包通过，保留既有Hook、裁剪与包体／插件耗时警告。首轮完整前端在内存紧张时停止，保留原日志；释放内存后完整重跑通过，未修改测试标准。证据见`.tmp/pkhex-api185-tests-full-serial.log`、`.tmp/pkhex-api185-lint.log`、`.tmp/pkhex-api185-typecheck.log`、`.tmp/pkhex-api185-core.log`和`.tmp/pkhex-api185-web.log`。

原始`C:\Users\Hakuhiro\Desktop\200\battery\E.sav`与工作副本SHA-256均保持`7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。上一批5edf994b的Actions38981330349已成功部署。外部Chrome连接再次超时，正式页面、连续操作及实际下载未核验，不作所有者验收；完整接入目标与剩余调用点仍保留待完成。

输入来源为WinForms `PKMEditor.ToggleInterface`／`FinalizeInterface`、`LoadSave`、`EditPK4`／`EditPK5`、`SAV_Inventory` 与Core `PlayerBag.IsQuantitySane`。手动特性沿实体／实际存档目录上限，一位编号沿0–9及空值为0的既有掩码；单项背包沿Core `MaxQuantityHaX`，批量数量仍沿原袋上限，不能假定所有物理格式都能保存整个输入范围。

## 当前边界

源码基线为本机 PKHeX 26.08.26，只读参考位于
`C:\Users\Hakuhiro\Downloads\PokeRNGKit-PKHeX-reference\PKHeX-master`。
项目保持 PokeRNGKit 名称、静态资源和本地 Worker 架构，不复刻原生程序名称或窗口标题。

`Startup.ForceHaXOnLaunch` 已进入设置模型。目前消费于不兼容转换策略、格位自动合法性标记及本批编辑上下文，
背包另有局部高级编辑入口。API180 的手动队伍能力值和 API181 的物理写入权限属于已接基础，
不能据此判定全局 HaX 已接齐。设置的存在、选项可修改或构建通过都不能替代功能证据。

## API184额外格位

独立列表、额外来源上下文、可写格位冻结预览及工作副本写入已接线，沿
`GetExtraSlots(HaX)` 与 `SlotInfoMisc.CanWriteTo`。额外位置不按普通箱位解析；
只读记录可查看和导出，清空与覆盖需明确确认。普通／HaX、公开夹具及朱紫／ZA
三种修订的完整文件对照已通过；前端三文件139项专项通过。
协议已升级API184，补充存储格式专项、浏览器核心、默认完整原生及359文件／2187项完整前端测试通过。
共享按钮样式收口后，Lint、完整类型、网页／PWA、全仓格式及差异检查通过；页面与实际下载未核验。
本阶段不表示全局HaX完成，当前工程状态见 `progress.md`。

## API183目录过滤

种类、持有道具、招式与回忆招式已分别接入可选状态，名称／PP的数字索引保留。
普通模式保留目录外的当前值并禁用该选项，其余不可选项隐藏；新选值在Core校验。
存档沿FilteredGameDataSource，独立实体沿自身存储上下文，原籍游戏不冒充目标游戏。
SM的普通招式与USUM回忆上限分开；绑定LGPE存档的HaX道具沿1057，
未绑定PB7文件仍沿其959上限，UInt16字段实际写入与回读专项通过。
Core内部LGPE招式名单固定取自26.08.26，并与SAV7b目录对照；道具使用公开存储接口。
18个游戏目录的普通／HaX对照、编号索引、读取不改来源与两文件12项三语专项通过。
既有标准／GB／回忆编辑、存档上下文、冻结放入与HaX空白流程专项，以及浏览器核心构建通过；
真实E.sav只检查工作副本。完整前端检查通过（358文件／2168项、类型、Lint、格式与网页／PWA构建）；
首轮前端版本常量遗漏已修正并完整重跑通过。默认完整原生检查退出0，含真实E.sav工作副本，
原件与副本哈希不变；外部Chrome连接超时，页面未核验。

## API182阶段

空白记录、空格位查看、GB名单容器、基础创建、冻结清空／队伍删除、显式空记录分析的路径已接线。
模式随Core元数据返回，普通模式保留非空保护；物理锁不因HaX解除。
七位超等级经验、EV超总量、LGPE EV及手动形态分支也已接线。原生专项含真实E.sav工作副本、浏览器核心构建、完整原生及完整前端检查通过（357文件／2162项测试）；外部Chrome连接超时，页面仍待核验。
损坏校验和的读取不修复来源；只有显式编辑／导出时按Core重新计算。

目录过滤和额外格位的工程接入已完成，实际页面仍待核验。
API185已接共享模式规则、当前缓冲自动提示、相遇建议与背包全局关联，完整门禁检查中；其余主窗口调用点仍待逐项核对。
下表仍为整组核对范围，不能跳过其余调用点。

## 上游调用面

2026-10-17只读复核：`EditPK4` 的手动特性读取及 `EditPK5.PreparePK5` 的隐藏特性同步已存在于相应编辑助手，但仍需按主窗口完整保存顺序逐项核对。`PKMEditor.ValidateMovePaint` 使用 `LegalMoveSource.Info.CanLearn` 的候选高亮，与本轮已接的当前四格招式／回忆警告是独立行为，继续列为待接项；不得以目录过滤或格位提示替代此项。

以下为 WinForms `.cs` 中 `HaX` 调用点的功能分组；每组仍须核对赋值顺序、控件掩码、空值、
格式存储和交互，不一律放宽到数值类型上限。

| 范围                                   | 上游依据                                                                                                                      | 当前状态与后续要求                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 模式初始化与切换                       | `Program.cs`、`MainWindow/Main.cs`、`Settings/StartupSettings.cs`                                                             | API182 随编辑元数据传递模式，沿设置指纹重建 Worker 并废弃旧票据；页面切换仍待核验                  |
| 空格位查看、删除与合法性菜单           | `Controls/SAV Editor/ContextMenuSAV.cs.MenuOpening`                                                                           | API182 已接空位查看、显式分析、冻结清空及队伍前移；物理锁保留，页面待核验                          |
| 空白实体的完整编辑与准备               | `Controls/PKM Editor/PKMEditor.cs.EditsComplete`、`PreparePKM`、`LoadSave.cs`                                                 | API182 已接空记录读取、基础创建与准备，保留类型／字节／编码；其他高级编辑器的可见性仍待逐项核对    |
| 目录与过滤                             | `MainWindow/Main.cs` 的 `FilteredGameDataSource` 与 `LocalizeUtil.InitializeStrings`、`PKMEditor.PopulateFilteredDataSources` | API183种类／持有道具／招式／回忆目录已接，保留三语和编号；相关专项、完整原生与前端通过，页面待核验 |
| 载入等级、经验与保存数值               | `LoadSave.cs.LoadSpeciesLevelEXP`／`SaveSpeciesLevelEXP`、`PKMEditor.cs` 等级经验处理、`StatEditor.SavePartyStats`            | 六项能力值、HaX 七位超等级经验及 EV 超总量已接；其他载入／保存分支继续核对                         |
| 手动特性和编号                         | `LoadSave.cs.SaveMisc*`、`PKMEditor.ToggleInterface`／`FinalizeInterface`                                                     | API185统一手动目录、编号及PA9普通例外；专项通过，完整门禁通过，页面待核验                          |
| 手动形态与无形态时保留                 | `PKMEditor.SetForms`／`ToggleInterface`                                                                                       | API182 已接格式4以上0–255输入，拒绝物理截断并保留原始 PID／手动特性；页面待核验                    |
| 第四／第五世代特殊载入与保存           | `EditPK4.cs`、`EditPK5.cs`                                                                                                    | 须逐项核对 HaX 分支；不只开放前端控件而继续走普通模式覆盖逻辑                                      |
| 相遇建议、自动合法性与招式提示         | `PKMEditor.UpdateLegality`、`ClickMetLocation`、招式提示处理，`Main.PKME_Tabs_LegalityChanged`                                | API185接自动状态／招式提示与相遇建议冻结预览，HaX隐藏；显式分析保留，完整门禁通过，页面待核验      |
| LGPE／PLA 原本隐藏字段、努力值与觉醒值 | `PKMEditor.FinalizeInterface`、`StatEditor.ToggleInterface`                                                                   | 相关字段与 AV/GV 功能已有；普通与 HaX 的可见性、可写性组合待核对                                   |
| 额外存储格位                           | `Controls/SAV Editor/SAVEditor.cs.InitializeExtraSlots` 的 `GetExtraSlots(HaX)`                                               | API184独立查看、模式过滤与可变格位冻结写入工程通过，额外位置单独绑定；页面与下载待核验             |
| 背包                                   | `Subforms/Save Editors/SAV_Inventory.cs`                                                                                      | API185全局关联目录／单项数量及批量可用状态，实际格式回读保护保留；专项通过                         |

## 实施与检查

额外格位实现沿 `Editing/Saves/Slots/Extensions.cs` 与 `Info/SlotInfoMisc.cs`。
报告／数据库通过 `SlotInfoLoader` 内部的 `save.GetExtraSlots(true)` 完整枚举，与API184独立编辑器分别核对。
上游普通／HaX的列表差异位于第七世代Resort记录；写入权限另由SlotInfoMisc的Mutable状态决定。
查看来源、party格式、实际槽号及可变写入目标已独立绑定，不按普通箱位或队伍位置解析。

目录实现沿 Core 的 `FilteredGameDataSource`，不把现有招式／道具数组直接改成稀疏列表。
现有调用按编号索引名称和 PP；应分别传递允许选择的编号，保留原编号索引及当前异常值的只读显示。
种类、持有道具、招式和回忆招式分别核对，特别保留 SM 回忆招式使用 USUM 上限的上游规则。
独立实体继续采用自身上下文与真实存档编辑上下文，不能为过滤目录伪造存档。

先完成权威权限状态及全部入口的一致消费，再接完整模式上下文、空白缓冲、编辑目录及保存行为。
同一模式不能在读取、编辑、准备、放入和导出之间自行改变；模式切换必须使过期预览失效。
普通模式保持现有保护，HaX 也继续使用上游物理格位写保护和兼容性确认。

对每组记录上游输入与存储约束，使用完整文件对照、只读来源保护和三语检查。
覆盖全部已支持实体及存储布局，真实 `E.sav` 只操作工作副本。
工程检查通过后，仍须在已授权的外部 Chrome／Edge 页面完成空位查看、连续编辑、
模式切换、焦点、放入、撤销和实际下载检查；由所有者共同完成 UI 验收。
