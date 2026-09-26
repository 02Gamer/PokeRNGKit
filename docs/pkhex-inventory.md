# PKHeX 完整接入清单

2026-09-26 所有者要求完整接入。基线为所有者提供的 PKHeX 26.08.26 源码，
不以 Core 已编译或单项功能完成代替完整接入。目标保持纯静态、本地处理和三语界面。

## 完成门槛

每项记录上游依据、实际界面、读取/编辑/导出能力、输入限制及验证证据。
上游世代特有窗口必须逐项核对；不支持的格式明确禁用，不静默改写。
所有编辑进入工作副本，提供撤销/还原；导出重算校验并重新读取验证。

## 实施顺序

| 阶段         | 内容                                                                   | 当前状态                                                   |
| ------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| 可视化仓储   | 队伍、真实盒子格位、名称、壁纸、宝可梦图像、选择与详情                 | 已实现，浏览器待检查                                       |
| 宝可梦编辑   | 基础身份、属性/能力值、招式、初训家/相遇、蛋、缎带、记忆、世代特有字段 | 基础字段已实现，其余待实现                                 |
| 仓储操作     | 导入/导出单只、移动/交换/复制/删除、箱名/壁纸、批量编辑、撤销          | 单只文件、队伍/盒子整理、箱名/壁纸及撤销已实现；批量待实现 |
| 合法性工具   | 分析报告、遇敌来源、数据转换、实体/礼物数据库                          | 单只报告已实现，浏览器待检查                               |
| 通用存档     | 完整训练家、背包、图鉴、神秘礼物、事件标记/常量                        | 仅训练家四字段已实现                                       |
| 世代专属     | 以下每个上游子窗口对应功能及特殊槽位                                   | 待逐项实现                                                 |
| 本地文件流程 | 存档识别、备份副本、单体/批量文件和目录导入导出                        | 存档副本、单只文件已实现；批量与目录待实现                 |
| 平台差异     | WinForms 外壳、桌面插件、任意本机文件监控与原始设备访问                | 评估浏览器等效路径；无后端                                 |

## 当前工程证据

API 24 新增双训练家记忆目录、内容/参数/程度/感受编辑及本地化预览，采用上游世代规则。
工作副本修订号使摘要外面板的旧草稿失效。五种存档的双训练家记忆、边界及完整载荷保持通过；
原生套件、648 前端测试、类型、lint 和两阶段构建通过，保留既有警告。
记忆窗口的居住/好感等其他区域仍待接入，浏览器仍待新版页面核验。

API 23 新增缎带分析状态和核心建议/精简操作，对应上游的批量合法性辅助路径。
保留超级训练等关联字段，草稿未应用时禁用批量操作；11 格式核心一致性、类型、lint、648 前端测试与两阶段构建通过。
保留既有警告，浏览器待检查；完整清单继续推进。

缎带面板新增 161 张上游原图，包含华丽大赛等级与回忆图标阈值，全部本地加载。
3 项资源/映射检查、类型、lint、前端构建与格式检查通过。Chrome 刷新仍为旧入口；合法性辅助及浏览器检查仍待完成。

API 22 接入缎带/证章手动编辑、数量和佩戴项，按需三语目录及草稿批量填满/清空。
15 实体字段对照和 11 格式往返、类型、lint、645 前端测试及两阶段构建通过。
保留既有警告和测试清理提示，浏览器待检查。
窗口图标、合法性提示与建议仍未完成。

API 21 接入四槽回忆招式与核心建议预览；建议只填入草稿，应用后可撤销。
保留当前招式、PP 和健康状态，不自动宣称合法性；五种存档往返、建议与核心一致检查通过。
原生套件、类型、lint、645 前端测试和两阶段构建通过，保留既有警告，浏览器待检查。

API 20 新增 PID/SID 双路径异色操作，包含指定 XOR 与取消异色，保留旧世代身份约束。
未知图腾无解时有限返回并保留输入，错误和操作提示提供三语。
11 格式双路径往返、未知图腾有解/无解及 EC 同步、类型、lint、645 前端测试和构建通过。
保留既有警告，浏览器待检查，其他完整清单仍未完成。

API 19 新增转换为蛋及上游字段联动，保留已有蛋记录并检查全蛋队伍限制。
11 格式原训练家/交易场景往返、数据保持和队伍限制、类型、lint、645 前端测试及构建通过。
浏览器待检查；不宣称自动生成合法遭遇或完整接入。

API 18 接入孵化周期与核心孵化，修正有其他持有者时蛋周期的读写字段。
11 格式往返、周期边界、随机记忆范围与数据保持、类型、lint、645 前端测试及构建通过。
保留既有警告；转为蛋等其余功能和浏览器验证仍待完成。

API 17 新增来源游戏、球种和相遇/蛋地点编辑，按来源/格式调用核心三语目录，
支持转移来源及 BDSP 特殊无地点值。选项预览不改工作副本，应用保留无关字段。
11 格式目录与编辑往返、边界和数据保持检查、类型、lint、645 前端测试与两阶段构建通过。
重启预览后 Chrome 仍读旧版页面，新增功能浏览器待检查；蛋状态转换及遭遇建议/数据库仍待实现。

API 16 新增相遇等级、日期和命运相遇标记的独立编辑，按真实存储宽度与日期范围校验。
仅应用变更字段，保留无关日期字节及队伍健康状态。来源/地点目录和蛋状态转换仍待实现。
11 格式往返、实体边界、受伤队伍状态保持、类型、lint、645 前端测试及核心/前端构建通过。
保留既有警告，浏览器待检查。

API 4 已实现可视化仓储及昵称、等级、亲密度、初训家/ID、IV/EV、招式/PP 基础编辑，
支持工作副本撤销和副本导出。11 种原生夹具、641 项前端测试及构建通过；浏览器待刷新检查。
种类、形态、性格、特性、相遇、缎带/记忆以及仓储移动等仍未接入，不将宝可梦编辑阶段标为完成。

API 5 新增选中格位的合法性摘要和详细报告，使用上游中/英/日文本。
合法/非法 PK3 样本及 11 种存档队伍/盒子上下文的原生检查通过；核心和前端构建通过。
补齐 TSX 测试收集后 185 文件 / 644 测试通过；新界面浏览器检查尚未完成。
只完成单只报告接口，合法性工具阶段仍有遇敌来源、转换和数据库待接入。

API 6 新增盒子名称/壁纸编辑及本地预览，接入工作副本、撤销与副本导出。
11 种存档的空/最长名称、首尾壁纸、非法输入与宝可梦数据保持的原生检查通过。
核心构建、185 文件 / 644 测试、类型与 lint 通过，核心生成后的最终前端打包通过，浏览器待检查；
解锁箱数、BoxFlags 和箱子重排仍未完成。

API 10 补充四招式的 PP 提升次数与恢复 PP，11 种格式的 0–3 次提升往返和越界拒绝通过。
核心与最终前端构建、类型及 lint 通过；完整宝可梦字段仍未完成，浏览器待检查。

API 11 新增性格、特性槽位、携带物品及第八世代能力值性格编辑，按上游处理旧世代 PID 关联。
11 种格式属性往返、第五世代隐藏特性切回、其他格位与原文件保持检查通过。
核心及最终前端构建、类型、lint、185 文件 / 644 前端测试通过。
种类/形态/性别及其他特殊字段仍未完成，浏览器待检查。

API 12 接入种类、形态、性别与默认名称，目录联动特性，写入按等级更新经验曲线。
11 种格式身份及昵称往返、第三世代未知图腾、支持格式的洛托姆/超能妙喵检查通过。
类型、lint、核心与最终前端构建、185 文件 / 644 前端测试通过，浏览器待检查。
原始 PID/加密常量、特殊形态参数和相遇/蛋等仍待接入。

API 13 新增独立高级 PID/加密常量编辑与核心重新生成，保护队伍 HP/异常状态和其他格位。
11 种格式原始值往返及边界拒绝通过，核心及最终前端构建、类型、lint、
185 文件 / 645 前端测试通过，浏览器待检查。
特殊形态参数、相遇/蛋及异色快捷操作等仍未完成。

API 14 接入特殊形态参数的命名、普通计数与计时控件，区分第六世代队伍区与盒子存储字段。
第六/七世代适用存档往返通过，PK8 糖饰和计数仅完成实体字段检查。
核心及最终前端构建、类型、lint、185 文件 / 645 前端测试通过。
身份变化后的参数默认值联动、相遇/蛋和异色快捷操作仍待接入，浏览器待检查。

API 15 补齐身份变化后的特殊参数范围联动，按旧/新模式清零、限制或保留值，保护盒子存储计数。
适用第六/七世代往返及 PK8 实体层转换边界、类型、核心及最终前端构建、
185 文件 / 645 前端测试通过。
相遇/蛋、异色快捷操作及后续完整清单仍未完成，浏览器待检查。

## 上游子窗口盘点

API 7 已接入盒内移动到空位、交换、覆盖复制与删除，11 种格式逐格载荷/队伍/原文件保持及
US 锁定格位检查通过；基础宝可梦编辑补齐锁定拒绝。原生检查、核心构建、185 文件 / 644 前端测试、类型和 lint 通过；核心生成后的最终前端打包通过。
API 8 已补齐队伍调度与损坏实体清理；单只文件流程和批量操作仍未完成。
11 种格式的队伍顺序、完整载荷与盒子/原文件保持检查通过，PK6 损坏实体删除通过。
185 文件 / 644 测试、类型、lint、核心与最终前端构建通过；浏览器新版检查待完成。

API 9 已接入单只文件导入与解密导出，使用核心默认转换规则，不启用强制不兼容转换。
11 种格式往返、PK3 → PK4、逆世代及 PGT 冲突拒绝检查通过；185 文件 / 644 前端测试、
类型、lint、核心与最终前端构建通过。浏览器待检查，批量/目录/加密导出仍未完成。

下表是来源文件盘点，不等于每个文件都需独立面板；共 129 个非 Designer 子窗口源码。
功能可合并进编辑页，但必须保留各版本的数据语义。所有状态初始为待核对，不能推定完成。

| 上游文件（PKHeX.WinForms）                                                    | 状态                                                     |
| ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| `Subforms/BoxExporter.cs`                                                     | 待核对                                                   |
| `Subforms/EntitySearchSetup.cs`                                               | 待核对                                                   |
| `Subforms/KChart.cs`                                                          | 待核对                                                   |
| `Subforms/Misc/EntitySummaryImage.cs`                                         | 待核对                                                   |
| `Subforms/Misc/PropertyComparer.cs`                                           | 待核对                                                   |
| `Subforms/Misc/SortableBindingList.cs`                                        | 待核对                                                   |
| `Subforms/PKM Editors/BatchEditor.cs`                                         | 待核对                                                   |
| `Subforms/PKM Editors/MemoryAmie.cs`                                          | 双训练家记忆已接入；居住/好感等其余区域待完成            |
| `Subforms/PKM Editors/MoveShopEditor.cs`                                      | 待核对                                                   |
| `Subforms/PKM Editors/PlusRecordEditor.cs`                                    | 待核对                                                   |
| `Subforms/PKM Editors/RibbonEditor.cs`                                        | 手动字段/数量/佩戴、图标及合法性辅助已接入；浏览器待检查 |
| `Subforms/PKM Editors/SuperTrainingEditor.cs`                                 | 待核对                                                   |
| `Subforms/PKM Editors/TechRecordEditor.cs`                                    | 待核对                                                   |
| `Subforms/PKM Editors/Text.cs`                                                | 待核对                                                   |
| `Subforms/ReportGrid.cs`                                                      | 待核对                                                   |
| `Subforms/SAV_Database.cs`                                                    | 待核对                                                   |
| `Subforms/SAV_Encounters.cs`                                                  | 待核对                                                   |
| `Subforms/SAV_FolderList.cs`                                                  | 待核对                                                   |
| `Subforms/SAV_MysteryGiftDB.cs`                                               | 待核对                                                   |
| `Subforms/Save Editors/Gen1/SAV_EventReset1.cs`                               | 待核对                                                   |
| `Subforms/Save Editors/Gen1/SAV_HallOfFame1.cs`                               | 待核对                                                   |
| `Subforms/Save Editors/Gen2/SAV_Misc2.cs`                                     | 待核对                                                   |
| `Subforms/Save Editors/Gen3/PokeBlock3CaseEditor.cs`                          | 待核对                                                   |
| `Subforms/Save Editors/Gen3/SAV_HallOfFame3.cs`                               | 待核对                                                   |
| `Subforms/Save Editors/Gen3/SAV_Misc3.cs`                                     | 待核对                                                   |
| `Subforms/Save Editors/Gen3/SAV_RTC3.cs`                                      | 待核对                                                   |
| `Subforms/Save Editors/Gen3/SAV_Roamer3.cs`                                   | 待核对                                                   |
| `Subforms/Save Editors/Gen3/SAV_SecretBase3.cs`                               | 待核对                                                   |
| `Subforms/Save Editors/Gen4/PoffinCase4Editor.cs`                             | 待核对                                                   |
| `Subforms/Save Editors/Gen4/PokeGear4Editor.cs`                               | 待核对                                                   |
| `Subforms/Save Editors/Gen4/Pokeathlon/PokeathlonConnection4Editor.cs`        | 待核对                                                   |
| `Subforms/Save Editors/Gen4/Pokeathlon/PokeathlonEventData4Editor.cs`         | 待核对                                                   |
| `Subforms/Save Editors/Gen4/Pokeathlon/PokeathlonEventRecord4Editor.cs`       | 待核对                                                   |
| `Subforms/Save Editors/Gen4/Pokeathlon/PokeathlonEventTrainer4Editor.cs`      | 待核对                                                   |
| `Subforms/Save Editors/Gen4/Pokeathlon/PokeathlonParticipant4Editor.cs`       | 待核对                                                   |
| `Subforms/Save Editors/Gen4/Pokeathlon/PokeathlonSpeciesForm4Editor.cs`       | 待核对                                                   |
| `Subforms/Save Editors/Gen4/SAV_Apricorn.cs`                                  | 待核对                                                   |
| `Subforms/Save Editors/Gen4/SAV_BattlePass.cs`                                | 待核对                                                   |
| `Subforms/Save Editors/Gen4/SAV_DLC4.cs`                                      | 待核对                                                   |
| `Subforms/Save Editors/Gen4/SAV_Gear.cs`                                      | 待核对                                                   |
| `Subforms/Save Editors/Gen4/SAV_Geonet4.cs`                                   | 待核对                                                   |
| `Subforms/Save Editors/Gen4/SAV_HoneyTree.cs`                                 | 待核对                                                   |
| `Subforms/Save Editors/Gen4/SAV_Misc4.cs`                                     | 待核对                                                   |
| `Subforms/Save Editors/Gen4/SAV_Pokeathlon4.cs`                               | 待核对                                                   |
| `Subforms/Save Editors/Gen4/SAV_Pokedex4.cs`                                  | 待核对                                                   |
| `Subforms/Save Editors/Gen4/SAV_Trainer4BR.cs`                                | 待核对                                                   |
| `Subforms/Save Editors/Gen4/SAV_Underground.cs`                               | 待核对                                                   |
| `Subforms/Save Editors/Gen5/CGearImage.cs`                                    | 待核对                                                   |
| `Subforms/Save Editors/Gen5/Join Avenue/IJoinAvenueSpecificEditor.cs`         | 待核对                                                   |
| `Subforms/Save Editors/Gen5/Join Avenue/JoinAvenueAssistantSpecificEditor.cs` | 待核对                                                   |
| `Subforms/Save Editors/Gen5/Join Avenue/JoinAvenueEntityGeneralEditor.cs`     | 待核对                                                   |
| `Subforms/Save Editors/Gen5/Join Avenue/JoinAvenueFanSpecificEditor.cs`       | 待核对                                                   |
| `Subforms/Save Editors/Gen5/Join Avenue/JoinAvenueListEditor.cs`              | 待核对                                                   |
| `Subforms/Save Editors/Gen5/Join Avenue/JoinAvenueSettingsEditor.cs`          | 待核对                                                   |
| `Subforms/Save Editors/Gen5/Join Avenue/JoinAvenueVisitorSpecificEditor.cs`   | 待核对                                                   |
| `Subforms/Save Editors/Gen5/Join Avenue/SAV_JoinAvenue.cs`                    | 待核对                                                   |
| `Subforms/Save Editors/Gen5/SAV_DLC5.cs`                                      | 待核对                                                   |
| `Subforms/Save Editors/Gen5/SAV_GlobalLink5.cs`                               | 待核对                                                   |
| `Subforms/Save Editors/Gen5/SAV_Medals5.cs`                                   | 待核对                                                   |
| `Subforms/Save Editors/Gen5/SAV_Misc5.cs`                                     | 待核对                                                   |
| `Subforms/Save Editors/Gen5/SAV_Pokedex5.cs`                                  | 待核对                                                   |
| `Subforms/Save Editors/Gen5/SAV_UnityTower.cs`                                | 待核对                                                   |
| `Subforms/Save Editors/Gen6/SAV_BerryFieldXY.cs`                              | 待核对                                                   |
| `Subforms/Save Editors/Gen6/SAV_BoxLayout.cs`                                 | 部分：箱名/壁纸已实现；解锁、标记、排序待实现            |
| `Subforms/Save Editors/Gen6/SAV_HallOfFame.cs`                                | 待核对                                                   |
| `Subforms/Save Editors/Gen6/SAV_Link6.cs`                                     | 待核对                                                   |
| `Subforms/Save Editors/Gen6/SAV_OPower.cs`                                    | 待核对                                                   |
| `Subforms/Save Editors/Gen6/SAV_PokeBlockORAS.cs`                             | 待核对                                                   |
| `Subforms/Save Editors/Gen6/SAV_PokedexORAS.cs`                               | 待核对                                                   |
| `Subforms/Save Editors/Gen6/SAV_PokedexXY.cs`                                 | 待核对                                                   |
| `Subforms/Save Editors/Gen6/SAV_Pokepuff.cs`                                  | 待核对                                                   |
| `Subforms/Save Editors/Gen6/SAV_Roamer6.cs`                                   | 待核对                                                   |
| `Subforms/Save Editors/Gen6/SAV_SecretBase.cs`                                | 待核对                                                   |
| `Subforms/Save Editors/Gen6/SAV_SuperTrain.cs`                                | 待核对                                                   |
| `Subforms/Save Editors/Gen6/SAV_Trainer.cs`                                   | 待核对                                                   |
| `Subforms/Save Editors/Gen7/SAV_Capture7GG.cs`                                | 待核对                                                   |
| `Subforms/Save Editors/Gen7/SAV_FestivalPlaza.cs`                             | 待核对                                                   |
| `Subforms/Save Editors/Gen7/SAV_HallOfFame7.cs`                               | 待核对                                                   |
| `Subforms/Save Editors/Gen7/SAV_Pokebean.cs`                                  | 待核对                                                   |
| `Subforms/Save Editors/Gen7/SAV_PokedexGG.cs`                                 | 待核对                                                   |
| `Subforms/Save Editors/Gen7/SAV_PokedexSM.cs`                                 | 待核对                                                   |
| `Subforms/Save Editors/Gen7/SAV_Trainer7.cs`                                  | 待核对                                                   |
| `Subforms/Save Editors/Gen7/SAV_Trainer7GG.cs`                                | 待核对                                                   |
| `Subforms/Save Editors/Gen7/SAV_ZygardeCell.cs`                               | 待核对                                                   |
| `Subforms/Save Editors/Gen8/PokedexResearchTask8aPanel.cs`                    | 待核对                                                   |
| `Subforms/Save Editors/Gen8/SAV_BlockDump8.cs`                                | 待核对                                                   |
| `Subforms/Save Editors/Gen8/SAV_FlagWork8b.cs`                                | 待核对                                                   |
| `Subforms/Save Editors/Gen8/SAV_Misc8b.cs`                                    | 待核对                                                   |
| `Subforms/Save Editors/Gen8/SAV_Poffin8b.cs`                                  | 待核对                                                   |
| `Subforms/Save Editors/Gen8/SAV_PokedexBDSP.cs`                               | 待核对                                                   |
| `Subforms/Save Editors/Gen8/SAV_PokedexLA.cs`                                 | 待核对                                                   |
| `Subforms/Save Editors/Gen8/SAV_PokedexResearchEditorLA.cs`                   | 待核对                                                   |
| `Subforms/Save Editors/Gen8/SAV_PokedexSWSH.cs`                               | 待核对                                                   |
| `Subforms/Save Editors/Gen8/SAV_Raid8.cs`                                     | 待核对                                                   |
| `Subforms/Save Editors/Gen8/SAV_SealStickers8b.cs`                            | 待核对                                                   |
| `Subforms/Save Editors/Gen8/SAV_Trainer8.cs`                                  | 待核对                                                   |
| `Subforms/Save Editors/Gen8/SAV_Trainer8a.cs`                                 | 待核对                                                   |
| `Subforms/Save Editors/Gen8/SAV_Trainer8b.cs`                                 | 待核对                                                   |
| `Subforms/Save Editors/Gen8/SAV_Underground8b.cs`                             | 待核对                                                   |
| `Subforms/Save Editors/Gen9/DonutEditor9a.cs`                                 | 待核对                                                   |
| `Subforms/Save Editors/Gen9/DonutFlavorProfile9a.cs`                          | 待核对                                                   |
| `Subforms/Save Editors/Gen9/EventWorkGrid64.cs`                               | 待核对                                                   |
| `Subforms/Save Editors/Gen9/SAV_Donut9a.cs`                                   | 待核对                                                   |
| `Subforms/Save Editors/Gen9/SAV_DonutGenerator9a.cs`                          | 待核对                                                   |
| `Subforms/Save Editors/Gen9/SAV_Fashion9.cs`                                  | 待核对                                                   |
| `Subforms/Save Editors/Gen9/SAV_FlagWork9a.cs`                                | 待核对                                                   |
| `Subforms/Save Editors/Gen9/SAV_Pokedex9a.cs`                                 | 待核对                                                   |
| `Subforms/Save Editors/Gen9/SAV_PokedexSV.cs`                                 | 待核对                                                   |
| `Subforms/Save Editors/Gen9/SAV_PokedexSVKitakami.cs`                         | 待核对                                                   |
| `Subforms/Save Editors/Gen9/SAV_Raid9.cs`                                     | 待核对                                                   |
| `Subforms/Save Editors/Gen9/SAV_RaidSevenStar9.cs`                            | 待核对                                                   |
| `Subforms/Save Editors/Gen9/SAV_Trainer9.cs`                                  | 待核对                                                   |
| `Subforms/Save Editors/Gen9/SAV_Trainer9a.cs`                                 | 待核对                                                   |
| `Subforms/Save Editors/Misc/SAV_Accessor.cs`                                  | 待核对                                                   |
| `Subforms/Save Editors/SAV_BoxList.cs`                                        | 待核对                                                   |
| `Subforms/Save Editors/SAV_BoxViewer.cs`                                      | 待核对                                                   |
| `Subforms/Save Editors/SAV_Chatter.cs`                                        | 待核对                                                   |
| `Subforms/Save Editors/SAV_EventFlags.cs`                                     | 待核对                                                   |
| `Subforms/Save Editors/SAV_EventFlags2.cs`                                    | 待核对                                                   |
| `Subforms/Save Editors/SAV_EventWork.cs`                                      | 待核对                                                   |
| `Subforms/Save Editors/SAV_GroupViewer.cs`                                    | 待核对                                                   |
| `Subforms/Save Editors/SAV_Inventory.cs`                                      | 待核对                                                   |
| `Subforms/Save Editors/SAV_MailBox.cs`                                        | 待核对                                                   |
| `Subforms/Save Editors/SAV_SimplePokedex.cs`                                  | 待核对                                                   |
| `Subforms/Save Editors/SAV_SimpleTrainer.cs`                                  | 待核对                                                   |
| `Subforms/Save Editors/SAV_Wondercard.cs`                                     | 待核对                                                   |
| `Subforms/Save Editors/TrainerStat.cs`                                        | 待核对                                                   |
| `Subforms/SaveHandlerTroubleshooter.cs`                                       | 待核对                                                   |
| `Subforms/SettingsEditor.cs`                                                  | 待核对                                                   |
