# PKHeX HaX 接入范围

## 2026-10-17 最终招式与特性保存（API187，工程通过，页面待核验）

基线`ca13c8c4e045634013da20733d5ecb23e7c21a2c`。合并全部草稿后调用具体实体的Core `FixMoves`，第五世代HaX按最终特性重算隐藏特性标记，再刷新校验和；独立文件显式导出采用相同处理。中间编辑、只读载入和原始来源不提前规范化，确认使用已冻结输出。协议与全部前端握手／夹具同步升级API187。

来源为WinForms `EditPK1`至`EditPK9`的`PreparePK*`及Core `PKM.FixMoves`／`PA9.FixMoves`。普通格式将空招式移至末尾，保持各招式的PP／PP提升组合，末尾清零；PA9使用自己的覆盖，保留位置，空招式PP设35、PP提升设0。基础编辑接受PA9目录规定的空招式PP上限35，修复最终文件再次编辑时被零PP假设拒绝的问题，其他输入上限不变。

扩展原生专项和默认完整原生重跑均退出0，包含真实E.sav工作副本。覆盖18种实体、普通／HaX、存储／队伍及加密／解密四种布局、PK5派生标记、ZA再次编辑、冻结放入、公开文件导出、额外格位、相遇建议、草稿提示和来源保护。证据见`.tmp/pkhex-api187-finalizing-checked.log`与`.tmp/pkhex-api187-native-full-final.log`。首轮旧SAV9ZA整文件预期及公开导出预期遗漏最终FixMoves，已按独立Core规范化修正，完整逐字节与原输入保护断言保留，失败日志保留。

浏览器核心、完整Lint／类型、364文件／2223项前端测试及最新核心的网页／PWA打包均退出0。证据见`.tmp/pkhex-api187-core.log`、`.tmp/pkhex-api187-lint.log`、`.tmp/pkhex-api187-typecheck.log`、`.tmp/pkhex-api187-tests-full.log`与`.tmp/pkhex-api187-web.log`。保留第三世代定点既有Hook、既有反射／裁剪和包体／插件耗时提示。原件与工作副本SHA-256均保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。

只读清单覆盖复核：上游Subforms的129个非Designer C#源码路径全部列入现有盘点，没有漏列路径；此项只证明来源清单覆盖，不证明所有行为已完成。上一轮ca13c8c4的Actions38997537497已成功（build、Windows、两处部署）。外部Chrome绑定本地5173页面仍超时，未读取页面；正式交互、连续焦点和实际下载未核验，不作所有者验收。

下一步继续核对WinForms EditPK6至EditPK9的FixRelearn与受ModifyPKM控制的FixMemories；MainWindow/Main.cs将开关绑定SlotWrite.SetUpdatePKM，当前产品没有这两项调用。PK6与PK7的Data[0xFE..]清理也保留待接，不将本批FixMoves写作全部最终保存行为已完成。完整PKHeX接入目标保持未完成。

## 2026-10-17 已接设置入口修正（前端，API186）

基线`0dd34787534c34f0417671338ef213730b985f9e`。设置页旧可用列表遗漏`startup.forceHaXOnLaunch`和`display.unicode`，导致已有功能仍显示待接并禁用。抽出共用可用状态判定后开放两项：HaX沿既有Worker模式与设置指纹重建流程，Unicode沿实际性别／形态和异色符号消费点。静态集合对照仅增加这两个路径；其他未接消费点继续保留待接状态。

输入依据为上游WinForms `Settings/StartupSettings.cs`的`ForceHaXOnLaunch`与`Settings/DisplaySettings.cs`的`Unicode`，两项均为bool，默认分别false／true。中文／英文／日文名称和说明复用现有来源资源。六文件45项专项及定向Lint通过，覆盖真实设置控件的可编辑状态、保存值、忙碌禁用、未接路径、字符显示和既有客户端重建；完整前端检查已退出0：364文件／2223项测试、类型、Lint、网页与PWA打包通过，保留第三世代定点既有Hook及包体／插件耗时提示；证据见`.tmp/pkhex-settings-availability-verify.log`。Core与协议不变，复用0dd34787的API186完整原生基线，本批不写原始存档，也不将原生基线写作重跑。页面仍受外部Chrome标签接口失败影响，未验收。

## 2026-10-17 当前输入提示与招式候选（API186，工程通过，页面待核验）

基线`b4bd47db3c926d2640ffc9c0438056d618c9b3ee`。标准与第一／二世代编辑器已接Core `LegalMoveInfo`的可学习招式候选，普通模式按可学习组优先、当前语言名称的ordinal顺序排列，并复用共享选择器浅色提示；HaX关闭提示。目录过滤与当前异常值保留独立处理，可学习性不会禁止选择其他目录内招式。回忆招式仍沿其独立目录与格位提示，不套用当前招式候选规则。

草稿区沿当前修订首次注册顺序稳定捕获，提示快照与实际放入使用相同顺序，控件重新注册不重排。当前有效草稿经350ms防抖进入独立只读Worker，复用既有草稿准备与真实存档上下文，不写实体缓冲或存档。请求串行、只保留最新结果；返回值绑定来源文件与完整请求哈希，来源／设置／配信列表变化后旧结果失效，无效输入与失败状态不保留旧推荐。共享选择器以候选值维护活动项，避免异步排序后键盘活动位置指向其他招式。中文／英文／日文状态与说明已接线。

API186最终专项与默认完整原生检查均退出0，包含真实E.sav工作副本。覆盖18种实体的存储／队伍／加密输入、Core可学习集合对照、普通／HaX、草稿种类变更、实际E／SM／LGPE上下文、请求哈希和拒绝路径、来源保护及既有冻结确认不被只读查询消费。证据见`.tmp/pkhex-api186-native-checked.log`和`.tmp/pkhex-api186-native-full.log`。

草稿捕获顺序修正后的完整类型、363文件／2219项完整前端测试、API186核心和最新核心网页／PWA打包通过。完整Lint通过，最后三文件再检查无新增警告；保留第三世代定点原有Hook以及既有编译／裁剪、包体与插件耗时提示。证据见`.tmp/pkhex-api186-order-typecheck.log`、`.tmp/pkhex-api186-order-tests-full.log`、`.tmp/pkhex-api186-lint.log`、`.tmp/pkhex-api186-order-lint.log`、`.tmp/pkhex-api186-core.log`和`.tmp/pkhex-api186-web.log`。

原始`C:\Users\Hakuhiro\Desktop\200\battery\E.sav`与工作副本SHA-256均保持`7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。上一批b4bd47db的Actions38989598601已成功部署。Chrome可被识别，但标签读取及直接绑定仍返回超时／fetch失败；释放闲置C#编译服务后复查仍未恢复。正式页面、键盘焦点、连续操作与实际下载未核验，不作所有者验收；完整接入目标和剩余调用面继续保留。

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
API185已接共享模式规则、当前缓冲自动提示、相遇建议与背包全局关联，完整门禁通过；其余主窗口调用点仍待逐项核对。
下表仍为整组核对范围，不能跳过其余调用点。

## 上游调用面

2026-10-17只读复核：`EditPK4` 的手动特性读取及 `EditPK5.PreparePK5` 的隐藏特性同步已存在于相应编辑助手，但仍需按主窗口完整保存顺序逐项核对。`PKMEditor.ValidateMovePaint` 使用 `LegalMoveSource.Info.CanLearn` 的候选高亮，与本轮已接的当前四格招式／回忆警告是独立行为，API186已接独立候选计算／排序／提示，专项与完整工程门禁已通过（见本页API186记录），页面仍待核验；不得以目录过滤或格位提示替代此项。

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
