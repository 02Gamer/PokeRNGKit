# PKHeX HaX 接入范围

## 当前边界

源码基线为本机 PKHeX 26.08.26，只读参考位于
`C:\Users\Hakuhiro\Downloads\PokeRNGKit-PKHeX-reference\PKHeX-master`。
项目保持 PokeRNGKit 名称、静态资源和本地 Worker 架构，不复刻原生程序名称或窗口标题。

`Startup.ForceHaXOnLaunch` 已进入设置模型。目前明确消费于不兼容转换策略与格位自动合法性标记，
背包另有局部高级编辑入口。API180 的手动队伍能力值和 API181 的物理写入权限属于已接基础，
不能据此判定全局 HaX 已接齐。设置的存在、选项可修改或构建通过都不能替代功能证据。

## 上游调用面

以下为 WinForms `.cs` 中 `HaX` 调用点的功能分组；每组仍须核对赋值顺序、控件掩码、空值、
格式存储和交互，不一律放宽到数值类型上限。

| 范围                                   | 上游依据                                                                                                                      | 当前状态与后续要求                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 模式初始化与切换                       | `Program.cs`、`MainWindow/Main.cs`、`Settings/StartupSettings.cs`                                                             | 设置存在；须把模式作为编辑上下文一致传递，模式变化废弃旧票据与 Worker 状态                               |
| 空格位查看、删除与合法性菜单           | `Controls/SAV Editor/ContextMenuSAV.cs.MenuOpening`                                                                           | 普通菜单、独立缓冲与权限已接；HaX 空位查看、空记录分析和删除语义待接，不把空位复制替代查看               |
| 空白实体的完整编辑与准备               | `Controls/PKM Editor/PKMEditor.cs.EditsComplete`、`PreparePKM`、`LoadSave.cs`                                                 | 当前读取／编辑／准备仍有有效非空记录要求，须核对并适配 HaX；读取时保持类型、实际原始字节及编码           |
| 目录与过滤                             | `MainWindow/Main.cs` 的 `FilteredGameDataSource` 与 `LocalizeUtil.InitializeStrings`、`PKMEditor.PopulateFilteredDataSources` | 须覆盖种类、道具、招式等实际目录，区分普通模式和 HaX；保留三语与格式位宽，不用静态总表无条件取代游戏目录 |
| 载入等级、经验与保存数值               | `LoadSave.cs.LoadSpeciesLevelEXP`／`SaveSpeciesLevelEXP`、`PKMEditor.cs` 等级经验处理、`StatEditor.SavePartyStats`            | 六项能力值已接；原始等级／经验保持和模式相关规范化仍待整组核对                                           |
| 手动特性和编号                         | `LoadSave.cs.SaveMisc*`、`PKMEditor.ToggleInterface`／`FinalizeInterface`                                                     | 手动字段已有；HaX 目录、能力编号及 PA9 普通模式例外仍需统一核对                                          |
| 手动形态与无形态时保留                 | `PKMEditor.SetForms`／`ToggleInterface`                                                                                       | 当前来源选择已有；HaX 数字控件、掩码与不自动清零行为待接                                                 |
| 第四／第五世代特殊载入与保存           | `EditPK4.cs`、`EditPK5.cs`                                                                                                    | 须逐项核对 HaX 分支；不只开放前端控件而继续走普通模式覆盖逻辑                                            |
| 相遇建议、自动合法性与招式提示         | `PKMEditor.UpdateLegality`、`ClickMetLocation`、招式提示处理，`Main.PKME_Tabs_LegalityChanged`                                | 格位自动标记已有模式消费；主编辑器自动状态、建议和提示仍待核对，显式菜单分析分别处理                     |
| LGPE／PLA 原本隐藏字段、努力值与觉醒值 | `PKMEditor.FinalizeInterface`、`StatEditor.ToggleInterface`                                                                   | 相关字段与 AV/GV 功能已有；普通与 HaX 的可见性、可写性组合待核对                                         |
| 额外存储格位                           | `Controls/SAV Editor/SAVEditor.cs.InitializeExtraSlots` 的 `GetExtraSlots(HaX)`                                               | 额外格位工具已存在；须核对模式是否决定完整列表以及各项读写能力，不能把物理锁误作图标                     |
| 背包                                   | `Subforms/Save Editors/SAV_Inventory.cs`                                                                                      | 局部 HaX 编辑已有；全局模式对目录、整理、数量和禁用状态的关联仍需核对                                    |

## 实施与检查

先完成权威权限状态及全部入口的一致消费，再接完整模式上下文、空白缓冲、编辑目录及保存行为。
同一模式不能在读取、编辑、准备、放入和导出之间自行改变；模式切换必须使过期预览失效。
普通模式保持现有保护，HaX 也继续使用上游物理格位写保护和兼容性确认。

对每组记录上游输入与存储约束，使用完整文件对照、只读来源保护和三语检查。
覆盖全部已支持实体及存储布局，真实 `E.sav` 只操作工作副本。
工程检查通过后，仍须在已授权的外部 Chrome／Edge 页面完成空位查看、连续编辑、
模式切换、焦点、放入、撤销和实际下载检查；由所有者共同完成 UI 验收。
