# PKHeX 其他提示音调用清单

来源为 PKHeX 26.08.26 的 WinForms 源码。此表记录直接调用 WinFormsUtil 的 164 个提示音位置，作为逐项接线依据；不代表全部已接入。WinFormsUtil 内部 Alert／Error／Prompt 的声音路径还需单独核对。加载存档和合法性报告的两个独立开关不在本表内。

| 来源文件与行号                                                       | 类型        | 浏览器状态                                                                                                                               |
| -------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `MainWindow/Main.cs:513`                                             | Asterisk    | 待核对与接线                                                                                                                             |
| `MainWindow/Main.cs:1120`                                            | Hand        | 待核对与接线                                                                                                                             |
| `MainWindow/Main.cs:1125`                                            | Hand        | 待核对与接线                                                                                                                             |
| `MainWindow/Main.cs:1177`                                            | Asterisk    | 已绑定：共享单只合法性报告复制成功且视图／报告／语言仍有效后 Other 提示；拒绝和迟到不提示，待页面核验                                    |
| `Subforms/BoxExporter.cs:49`                                         | Asterisk    | 已绑定：SaveEditorPanel.downloadArchive，Notify=Silent(1) 且已发起下载；待页面核验                                                       |
| `Subforms/EntitySearchSetup.cs:111`                                  | Asterisk    | 已绑定：PokemonSearchEditor.search，用户搜索完成；后台刷新不播放；待页面核验                                                             |
| `Subforms/EntitySearchSetup.cs:117`                                  | Asterisk    | 已绑定：PokemonSearchEditor.reset；待页面核验                                                                                            |
| `Subforms/SAV_MysteryGiftDB.cs:220`                                  | Exclamation | 平台对应：网页只渲染实际候选，无空白图片框点击入口；Core 保留越界拒绝，正常候选不播放错误提示；待页面核验                                |
| `Subforms/SAV_MysteryGiftDB.cs:226`                                  | Exclamation | 平台对应：网页只渲染实际候选，无空白图片框点击入口；Core 保留越界拒绝，正常候选不播放错误提示；待页面核验                                |
| `Subforms/SAV_MysteryGiftDB.cs:276`                                  | Asterisk    | 已绑定：MysteryGiftDatabaseViewer，手动重置筛选；初始化不播放；待页面核验                                                                |
| `Subforms/SAV_MysteryGiftDB.cs:392`                                  | Asterisk    | 已绑定：MysteryGiftDatabaseViewer.search，用户搜索完成；翻页及旧资料响应不播放；待页面核验                                               |
| `Subforms/SAV_Encounters.cs:133`                                     | Asterisk    | 已绑定：PokemonEncounterViewer.changeCriteria，重置条件成功；待页面核验                                                                  |
| `Subforms/SAV_Encounters.cs:139`                                     | Asterisk    | 已绑定：PokemonEncounterViewer.changeCriteria，从编辑器读取条件成功；待页面核验                                                          |
| `Subforms/SAV_Encounters.cs:232`                                     | Exclamation | 平台对应：网页只渲染实际候选，无空白图片框点击入口；Core 保留越界拒绝，正常候选不播放错误提示；待页面核验                                |
| `Subforms/SAV_Encounters.cs:238`                                     | Exclamation | 平台对应：网页只渲染实际候选，无空白图片框点击入口；Core 保留越界拒绝，正常候选不播放错误提示；待页面核验                                |
| `Subforms/SAV_Encounters.cs:329`                                     | Asterisk    | 已绑定：PokemonEncounterViewer，手动重置筛选；待页面核验                                                                                 |
| `Subforms/SAV_Encounters.cs:512`                                     | Asterisk    | 已绑定：PokemonEncounterViewer.search，用户搜索完成；翻页不播放；待页面核验                                                              |
| `Subforms/SAV_Database.cs:195`                                       | Exclamation | 平台对应：网页只渲染实际候选，无空白图片框点击入口；Core 保留越界拒绝，正常候选不播放错误提示；待页面核验                                |
| `Subforms/SAV_Database.cs:227`                                       | Exclamation | 平台对应：网页只渲染实际候选，无空白图片框点击入口；Core 保留越界拒绝，正常候选不播放错误提示；待页面核验                                |
| `Subforms/SAV_Database.cs:263`                                       | Asterisk    | 已绑定：PokemonDatabaseViewer.confirm，删除写入成功后；失败及旧资料响应不播放；待页面核验                                                |
| `Subforms/SAV_Database.cs:316`                                       | Asterisk    | 已绑定：DatabaseFilters，手动重置筛选；初始化不播放；待页面核验                                                                          |
| `Subforms/SAV_Database.cs:554`                                       | Asterisk    | 已绑定：PokemonDatabaseViewer.search，用户搜索完成；翻页及旧资料响应不播放；待页面核验                                                   |
| `Subforms/Save Editors/Gen2/SAV_Misc2.cs:36`                         | Asterisk    | 已绑定：gsBall2Edit.enableGsBall；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                                 |
| `Controls/SAV Editor/BoxEditor.cs:376`                               | Exclamation | 已绑定：PokemonSearchEditor.seek，无结果 Exclamation；待页面核验                                                                         |
| `Controls/SAV Editor/BoxEditor.cs:383`                               | Asterisk    | 已绑定：PokemonSearchEditor.seek，成功 Asterisk；待页面核验                                                                              |
| `Controls/SAV Editor/ContextMenuSAV.cs:43`                           | Asterisk    | 待核对与接线                                                                                                                             |
| `Controls/SAV Editor/ContextMenuSAV.cs:83`                           | Asterisk    | 待核对与接线                                                                                                                             |
| `Subforms/Save Editors/SAV_BoxList.cs:49`                            | Asterisk    | 待核对与接线                                                                                                                             |
| `Subforms/Save Editors/SAV_Wondercard.cs:764`                        | Asterisk    | 待核对与接线                                                                                                                             |
| `Subforms/Save Editors/SAV_MailBox.cs:435`                           | Question    | 待核对与接线                                                                                                                             |
| `Subforms/Save Editors/SAV_MailBox.cs:583`                           | Asterisk    | 待核对与接线                                                                                                                             |
| `Subforms/Save Editors/SAV_Inventory.cs:451`                         | Asterisk    | 待核对与接线                                                                                                                             |
| `Controls/PKM Editor/PKMEditor.cs:246`                               | Exclamation | 待核对与接线                                                                                                                             |
| `Subforms/Save Editors/Gen9/SAV_Trainer9a.cs:241`                    | Asterisk    | 已绑定：trainer9aCommit，冻结预览 operations.key=resetAndCollectScrews；普通收集不触发此直接调用；待页面核验                             |
| `Subforms/Save Editors/Gen9/SAV_Trainer9.cs:219`                     | Asterisk    | 已绑定：trainer9Commit，冻结预览 operations.fly；待页面核验                                                                              |
| `Subforms/Save Editors/Gen9/SAV_Trainer9.cs:344`                     | Asterisk    | 已绑定：trainer9Commit，冻结预览 operations.stakes；待页面核验                                                                           |
| `Subforms/Save Editors/Gen9/SAV_Trainer9.cs:351`                     | Asterisk    | 已绑定：trainer9Commit，冻结预览 operations.tm；待页面核验                                                                               |
| `Subforms/Save Editors/Gen9/SAV_Trainer9.cs:358`                     | Asterisk    | 已绑定：trainer9Commit，冻结预览 operations.legendaries；待页面核验                                                                      |
| `Subforms/Save Editors/Gen9/SAV_Trainer9.cs:365`                     | Asterisk    | 已绑定：trainer9Commit，冻结预览 operations.coaches；待页面核验                                                                          |
| `Subforms/Save Editors/Gen9/SAV_Trainer9.cs:385`                     | Asterisk    | 已绑定：trainer9Commit，冻结预览 operations.bike；待页面核验                                                                             |
| `Subforms/Save Editors/Gen9/SAV_Trainer9.cs:406`                     | Asterisk    | 已绑定：SaveTrainerImage.publish，PNG／JPEG／BMP 已发起下载，含存活／代次保护；待页面核验                                                |
| `Subforms/Save Editors/Gen9/SAV_Trainer9.cs:418`                     | Asterisk    | 已绑定：trainer9Commit，冻结预览 operations.clothing；待页面核验                                                                         |
| `Subforms/Save Editors/Gen9/SAV_Trainer9.cs:425`                     | Asterisk    | 已绑定：trainer9Commit，冻结预览 operations.throwStyles；待页面核验                                                                      |
| `Subforms/Save Editors/SAV_BoxViewer.cs:47`                          | Asterisk    | 待核对与接线                                                                                                                             |
| `Subforms/Save Editors/Gen5/SAV_DLC5.cs:166`                         | Asterisk    | 已绑定：SaveEditorPanel.previewDlc5／previewCGear5(raw)，Core 成功识别导入后的预览；不在确认保存时重复；待页面核验                       |
| `Subforms/Save Editors/Gen5/SAV_DLC5.cs:236`                         | Asterisk    | 已绑定：SaveEditorPanel.previewCGear5(image)，Core 预览颜色≤16 且图块≤255；超限保留警告并静默；待页面核验                                |
| `Subforms/Save Editors/Gen9/SAV_Raid9.cs:95`                         | Asterisk    | 已绑定：raid9Commit，当前冻结预览含 propagate，成功应用回调；待页面核验                                                                  |
| `Subforms/Save Editors/Gen9/SAV_PokedexSVKitakami.cs:304`            | Asterisk    | 已绑定：pokedex9Edit.give，DLC 图鉴分支；待页面核验                                                                                      |
| `Subforms/Save Editors/Gen9/SAV_PokedexSVKitakami.cs:319`            | Asterisk    | 已绑定：pokedex9Edit.clear，DLC 图鉴分支；待页面核验                                                                                     |
| `Subforms/Save Editors/Gen9/SAV_PokedexSVKitakami.cs:329`            | Asterisk    | 已绑定：pokedex9Edit.seen，DLC 图鉴分支；待页面核验                                                                                      |
| `Subforms/Save Editors/Gen9/SAV_PokedexSVKitakami.cs:338`            | Asterisk    | 已绑定：pokedex9Edit.uncaught，DLC 图鉴分支；待页面核验                                                                                  |
| `Subforms/Save Editors/Gen9/SAV_PokedexSVKitakami.cs:348`            | Asterisk    | 已绑定：pokedex9Edit.caught，DLC 图鉴分支；待页面核验                                                                                    |
| `Subforms/Save Editors/Gen9/SAV_PokedexSVKitakami.cs:358`            | Asterisk    | 已绑定：pokedex9Edit.complete，DLC 图鉴分支；待页面核验                                                                                  |
| `Subforms/Save Editors/Gen8/SAV_Underground8b.cs:143`                | Asterisk    | 已绑定：underground8bEdit.all；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                      |
| `Subforms/Save Editors/Gen8/SAV_Underground8b.cs:155`                | Asterisk    | 已绑定：underground8bEdit.none；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                     |
| `Subforms/Save Editors/Gen5/SAV_Pokedex5.cs:241`                     | Asterisk    | 已绑定：pokedex5Edit.give/giveNone，合法单物种范围；待页面核验                                                                           |
| `Subforms/Save Editors/Gen5/SAV_Pokedex5.cs:263`                     | Asterisk    | 已绑定：pokedex5Edit，species=0 的五种全图鉴批量；待页面核验                                                                             |
| `Subforms/Save Editors/Gen5/SAV_Pokedex5.cs:300`                     | Asterisk    | 已绑定：pokedex5Edit，species=0 的 formsClear/formsFirst/formsAll；待页面核验                                                            |
| `Subforms/Save Editors/Gen9/SAV_PokedexSV.cs:241`                    | Asterisk    | 已绑定：pokedex9Edit.give；待页面核验                                                                                                    |
| `Subforms/Save Editors/Gen9/SAV_PokedexSV.cs:256`                    | Asterisk    | 已绑定：pokedex9Edit.clear；待页面核验                                                                                                   |
| `Subforms/Save Editors/Gen9/SAV_PokedexSV.cs:266`                    | Asterisk    | 已绑定：pokedex9Edit.seen；待页面核验                                                                                                    |
| `Subforms/Save Editors/Gen9/SAV_PokedexSV.cs:275`                    | Asterisk    | 已绑定：pokedex9Edit.uncaught；待页面核验                                                                                                |
| `Subforms/Save Editors/Gen9/SAV_PokedexSV.cs:285`                    | Asterisk    | 已绑定：pokedex9Edit.caught；待页面核验                                                                                                  |
| `Subforms/Save Editors/Gen9/SAV_PokedexSV.cs:295`                    | Asterisk    | 已绑定：pokedex9Edit.complete；待页面核验                                                                                                |
| `Subforms/Save Editors/Gen9/SAV_Pokedex9a.cs:321`                    | Asterisk    | 已绑定：pokedex9aEdit.give；待页面核验                                                                                                   |
| `Subforms/Save Editors/Gen9/SAV_Pokedex9a.cs:336`                    | Asterisk    | 已绑定：pokedex9aEdit.clear；待页面核验                                                                                                  |
| `Subforms/Save Editors/Gen9/SAV_Pokedex9a.cs:346`                    | Asterisk    | 已绑定：pokedex9aEdit.seen；待页面核验                                                                                                   |
| `Subforms/Save Editors/Gen9/SAV_Pokedex9a.cs:355`                    | Asterisk    | 已绑定：pokedex9aEdit.uncaught；待页面核验                                                                                               |
| `Subforms/Save Editors/Gen9/SAV_Pokedex9a.cs:365`                    | Asterisk    | 已绑定：pokedex9aEdit.caught；待页面核验                                                                                                 |
| `Subforms/Save Editors/Gen9/SAV_Pokedex9a.cs:375`                    | Asterisk    | 已绑定：pokedex9aEdit.complete；待页面核验                                                                                               |
| `Subforms/Save Editors/Gen5/SAV_Misc5.cs:639`                        | Asterisk    | 已绑定：misc5Edit.forestRandom；待页面核验                                                                                               |
| `Subforms/Save Editors/Gen5/SAV_Misc5.cs:909`                        | Asterisk    | 已绑定：misc5Edit.giveProps；待页面核验                                                                                                  |
| `Subforms/Save Editors/Gen5/SAV_Medals5.cs:69`                       | Asterisk    | 已绑定：medals5Edit.giveAll；待页面核验                                                                                                  |
| `Subforms/Save Editors/Gen5/SAV_Medals5.cs:90`                       | Asterisk    | 已绑定：medals5Edit.import；待页面核验                                                                                                   |
| `Subforms/Save Editors/Gen5/SAV_Medals5.cs:117`                      | Asterisk    | 已绑定：medals5Edit.complete；待页面核验                                                                                                 |
| `Subforms/Save Editors/Gen5/SAV_Medals5.cs:126`                      | Asterisk    | 已绑定：medals5Edit.clear；待页面核验                                                                                                    |
| `Subforms/Save Editors/Gen5/SAV_Medals5.cs:133`                      | Asterisk    | 已绑定：medals5Edit.calculateRank；待页面核验                                                                                            |
| `Subforms/Save Editors/Gen9/SAV_Fashion9.cs:266`                     | Asterisk    | 已绑定：fashion9Commit，当前冻结预览含 owned，成功应用回调；一次批量只播放一声；待页面核验                                               |
| `Subforms/Save Editors/Gen9/SAV_Fashion9.cs:505`                     | Asterisk    | 已绑定：fashion9Commit，owned 的 ZA 格位表分支；同次批量合并提示；待页面核验                                                             |
| `Subforms/Save Editors/Gen8/SAV_Trainer8.cs:259`                     | Asterisk    | 已绑定：trainer8Edit.copyParty(card)；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                               |
| `Subforms/Save Editors/Gen8/SAV_Trainer8.cs:266`                     | Asterisk    | 已绑定：trainer8Edit.copyParty(title)；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                              |
| `Subforms/Save Editors/Gen8/SAV_Trainer8.cs:308`                     | Asterisk    | 已绑定：trainer8Edit.fashion；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                       |
| `Subforms/Save Editors/Gen8/SAV_Trainer8.cs:327`                     | Asterisk    | 已绑定：trainer8Edit.diglett；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                       |
| `Subforms/Save Editors/Gen8/SAV_SealStickers8b.cs:140`               | Asterisk    | 已绑定：seal8bEdit.all；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                             |
| `Subforms/Save Editors/Gen8/SAV_SealStickers8b.cs:151`               | Asterisk    | 已绑定：seal8bEdit.none；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                            |
| `Subforms/Save Editors/Gen9/SAV_Donut9a.cs:150`                      | Asterisk    | 已绑定：donut9aCommit，当前令牌绑定 randomLv3；待页面核验                                                                                |
| `Subforms/Save Editors/Gen9/SAV_Donut9a.cs:158`                      | Asterisk    | 已绑定：donut9aCommit，当前令牌绑定 clone；待页面核验                                                                                    |
| `Subforms/Save Editors/Gen9/SAV_Donut9a.cs:166`                      | Asterisk    | 已绑定：donut9aCommit，当前令牌绑定 shiny；待页面核验                                                                                    |
| `Subforms/Save Editors/Gen9/SAV_Donut9a.cs:181`                      | Asterisk    | 已绑定：donut9aCommit，当前令牌绑定 generate；待页面核验                                                                                 |
| `Subforms/Save Editors/Gen9/SAV_Donut9a.cs:196`                      | Asterisk    | 已绑定：donut9aCommit，当前令牌绑定 import／hex；确认应用后播放；待页面核验                                                              |
| `Subforms/Save Editors/Gen9/SAV_Donut9a.cs:244`                      | Asterisk    | 已绑定：Donut9aEditor 原有拖放导入沿 import 成功提交；失败不播放成功音；待页面核验                                                       |
| `Subforms/Save Editors/Gen9/SAV_Donut9a.cs:280`                      | Asterisk    | 已绑定：exportDonut9a(clipboard)，72 字节原序十六进制写入成功且操作仍有效；待页面核验                                                    |
| `Subforms/Save Editors/Gen8/SAV_PokedexSWSH.cs:202`                  | Asterisk    | 已绑定：pokedex8Edit.give；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                          |
| `Subforms/Save Editors/Gen8/SAV_PokedexSWSH.cs:216`                  | Asterisk    | 已绑定：pokedex8Edit.clear；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                         |
| `Subforms/Save Editors/Gen8/SAV_PokedexSWSH.cs:225`                  | Asterisk    | 已绑定：pokedex8Edit.seen；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                          |
| `Subforms/Save Editors/Gen8/SAV_PokedexSWSH.cs:233`                  | Asterisk    | 已绑定：pokedex8Edit.uncaught；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                      |
| `Subforms/Save Editors/Gen8/SAV_PokedexSWSH.cs:242`                  | Asterisk    | 已绑定：pokedex8Edit.caught；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                        |
| `Subforms/Save Editors/Gen8/SAV_PokedexSWSH.cs:251`                  | Asterisk    | 已绑定：pokedex8Edit.complete；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                      |
| `Subforms/Save Editors/Gen8/SAV_PokedexSWSH.cs:259`                  | Asterisk    | 已绑定：pokedex8Edit.counts；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                        |
| `Subforms/Save Editors/Gen5/Join Avenue/JoinAvenueListEditor.cs:122` | Asterisk    | 已绑定：SaveEditorPanel.exportAvenue5，发起实体下载后；待页面核验                                                                        |
| `Subforms/Save Editors/Gen8/SAV_PokedexLA.cs:473`                    | Asterisk    | 已绑定：pokedex8aEdit.report；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                       |
| `Subforms/Save Editors/Gen7/SAV_ZygardeCell.cs:85`                   | Asterisk    | 已绑定：zygarde7Edit.giveAll；待页面核验                                                                                                 |
| `Controls/SAV Editor/SlotChangeManager.cs:144`                       | Asterisk    | 待核对与接线                                                                                                                             |
| `Subforms/Save Editors/Gen8/SAV_PokedexBDSP.cs:183`                  | Asterisk    | 已绑定：pokedex8bEdit，species=0 的五种全图鉴动作；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                  |
| `Subforms/Save Editors/Gen7/SAV_Trainer7GG.cs:192`                   | Asterisk    | 已绑定：TrainerGGEditor.copySummary，非空摘要写入剪贴板成功且视图存活；待页面核验                                                        |
| `Subforms/Save Editors/Gen7/SAV_Trainer7GG.cs:297`                   | Asterisk    | 已绑定：TrainerGGEditor，parkBatch 的 receipt.unplaced 为空时才通知成功提交回调；待页面核验                                              |
| `Subforms/Save Editors/Gen7/SAV_Trainer7GG.cs:322`                   | Asterisk    | 已绑定：trainerGGEdit.parkClear；待页面核验                                                                                              |
| `Subforms/Save Editors/Gen7/SAV_Trainer7GG.cs:332`                   | Asterisk    | 已绑定：trainerGGEdit.parkDelete；待页面核验                                                                                             |
| `Subforms/Save Editors/Gen7/SAV_Trainer7GG.cs:338`                   | Asterisk    | 已绑定：trainerGGEdit.titles；待页面核验                                                                                                 |
| `Subforms/Save Editors/Gen7/SAV_Trainer7GG.cs:345`                   | Asterisk    | 已绑定：trainerGGEdit.fashion；待页面核验                                                                                                |
| `Subforms/Save Editors/Gen7/SAV_Trainer7.cs:553`                     | Asterisk    | 已绑定：trainer7Edit.fashion；待页面核验                                                                                                 |
| `Subforms/Save Editors/Gen8/SAV_Poffin8b.cs:215`                     | Asterisk    | 已绑定：foodEdit.caseFill，仅 SAV8BS；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                               |
| `Subforms/Save Editors/Gen8/SAV_Poffin8b.cs:223`                     | Asterisk    | 已绑定：foodEdit.caseClear，仅 SAV8BS；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                              |
| `Subforms/Save Editors/Gen7/SAV_PokedexSM.cs:300`                    | Asterisk    | 已绑定：pokedex7Edit，index=-1 的五种全图鉴动作；待页面核验                                                                              |
| `Subforms/Save Editors/Gen8/SAV_Misc8b.cs:51`                        | Asterisk    | 已绑定：misc8bEdit.spiritomb；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                       |
| `Subforms/Save Editors/Gen8/SAV_Misc8b.cs:58`                        | Asterisk    | 已绑定：misc8bEdit.shaymin；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                         |
| `Subforms/Save Editors/Gen8/SAV_Misc8b.cs:65`                        | Asterisk    | 已绑定：misc8bEdit.darkrai；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                         |
| `Subforms/Save Editors/Gen8/SAV_Misc8b.cs:72`                        | Asterisk    | 已绑定：misc8bEdit.arceus；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                          |
| `Subforms/Save Editors/Gen8/SAV_Misc8b.cs:79`                        | Asterisk    | 已绑定：misc8bEdit.boxLegend；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                       |
| `Subforms/Save Editors/Gen8/SAV_Misc8b.cs:86`                        | Asterisk    | 已绑定：misc8bEdit.roamers；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                         |
| `Subforms/Save Editors/Gen8/SAV_Misc8b.cs:93`                        | Asterisk    | 已绑定：misc8bEdit.zones；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                           |
| `Subforms/Save Editors/Gen8/SAV_Misc8b.cs:100`                       | Asterisk    | 已绑定：misc8bEdit.defeat；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                          |
| `Subforms/Save Editors/Gen8/SAV_Misc8b.cs:108`                       | Asterisk    | 已绑定：misc8bEdit.rebattle；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                        |
| `Subforms/Save Editors/Gen8/SAV_Misc8b.cs:116`                       | Asterisk    | 已绑定：misc8bEdit.fashion；工作副本成功应用后，失败及迟到结果不触发；待页面核验                                                         |
| `Subforms/Save Editors/Gen4/SAV_BattlePass.cs:267`                   | Asterisk    | 待核对与接线                                                                                                                             |
| `Subforms/Save Editors/Gen4/SAV_BattlePass.cs:301`                   | Asterisk    | 待核对与接线                                                                                                                             |
| `Subforms/Save Editors/Gen4/SAV_BattlePass.cs:579`                   | Asterisk    | 已绑定：battlePass4Edit.import；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                                   |
| `Subforms/Save Editors/Gen4/SAV_BattlePass.cs:614`                   | Asterisk    | 待核对与接线                                                                                                                             |
| `Subforms/Save Editors/Gen7/SAV_PokedexGG.cs:379`                    | Asterisk    | 已绑定：pokedex7Edit，index=-1 的五种全图鉴动作；待页面核验                                                                              |
| `Subforms/Save Editors/Gen7/SAV_Pokebean.cs:65`                      | Asterisk    | 已绑定：foodEdit.fill，仅 SAV7SM／SAV7USUM；待页面核验                                                                                   |
| `Subforms/Save Editors/Gen7/SAV_Pokebean.cs:72`                      | Asterisk    | 已绑定：foodEdit.clear，仅 SAV7SM／SAV7USUM；待页面核验                                                                                  |
| `Subforms/Save Editors/Gen4/PokeGear4Editor.cs:31`                   | Asterisk    | 已绑定：pokegear4Edit.all；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                                        |
| `Subforms/Save Editors/Gen4/PokeGear4Editor.cs:38`                   | Asterisk    | 已绑定：pokegear4Edit.nonTrainers；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                                |
| `Subforms/Save Editors/Gen4/PokeGear4Editor.cs:45`                   | Asterisk    | 已绑定：pokegear4Edit.clear；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                                      |
| `Subforms/Save Editors/Gen6/SAV_Trainer.cs:341`                      | Asterisk    | 已绑定：trainer6Edit.accessories；待页面核验                                                                                             |
| `Controls/SAV Editor/SAVEditor.cs:477`                               | Asterisk    | 待核对与接线                                                                                                                             |
| `Controls/SAV Editor/SAVEditor.cs:986`                               | Asterisk    | 三语关联检查报告显式复制成功且视图存活后 Other 提示；失败／迟到无提示，待页面核验                                                        |
| `Subforms/Save Editors/Gen6/SAV_BoxLayout.cs:236`                    | Asterisk    | 待核对与接线                                                                                                                             |
| `Subforms/Save Editors/Gen7/SAV_FestivalPlaza.cs:475`                | Asterisk    | 平台对应：trainerId／usedFlags／usedStats 原生输入 maxLength=24／8／8，浏览器阻止超长输入；Core 仍校验，不给合法输入添加提示；待页面核验 |
| `Subforms/Save Editors/Gen7/SAV_FestivalPlaza.cs:766`                | Asterisk    | 已绑定：FestivalPlazaEditor，已确认 glasses 动作的成功提交回调；待页面核验                                                               |
| `Subforms/Save Editors/Gen6/SAV_SecretBase.cs:409`                   | Asterisk    | 已绑定：secretBase6Edit.import；待页面核验                                                                                               |
| `Subforms/Save Editors/Gen7/SAV_Capture7GG.cs:125`                   | Asterisk    | 已绑定：pokedex7Edit.capture(kind=all)；待页面核验                                                                                       |
| `Subforms/Save Editors/Gen7/SAV_Capture7GG.cs:133`                   | Asterisk    | 已绑定：pokedex7Edit.capture(kind=sum)；待页面核验                                                                                       |
| `Subforms/Save Editors/Gen4/SAV_Pokedex4.cs:245`                     | Asterisk    | 已绑定：pokedex4Edit，species=0 的五种批量动作；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                   |
| `Subforms/Save Editors/Gen4/SAV_Pokeathlon4.cs:450`                  | Asterisk    | 已绑定：pokeathlon4Edit.medalsBatch(true)；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                        |
| `Subforms/Save Editors/Gen4/SAV_Pokeathlon4.cs:458`                  | Asterisk    | 已绑定：pokeathlon4Edit.medalsBatch(false)；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                       |
| `Subforms/Save Editors/Gen3/SAV_HallOfFame3.cs:183`                  | Asterisk    | 已绑定：hall3Edit.party；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                                          |
| `Subforms/Save Editors/Gen4/SAV_Misc4.cs:284`                        | Asterisk    | 已绑定：misc4Edit.all(poketch)；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                                   |
| `Subforms/Save Editors/Gen4/SAV_Misc4.cs:803`                        | Asterisk    | 已绑定：misc4Edit.all/legal(seals)；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                               |
| `Subforms/Save Editors/Gen4/SAV_Misc4.cs:875`                        | Asterisk    | 已绑定：misc4Edit.all/legal(accessories)；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                         |
| `Subforms/Save Editors/Gen4/SAV_Misc4.cs:949`                        | Asterisk    | 已绑定：misc4Edit.all/legal(backdrops)；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                           |
| `Subforms/Save Editors/Gen4/SAV_DLC4.cs:281`                         | Asterisk    | 已绑定：video4Import；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                                             |
| `Subforms/Save Editors/Gen4/SAV_DLC4.cs:321`                         | Asterisk    | 已绑定：SaveEditorPanel.exportVideo4，下载已发起；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                 |
| `Subforms/Save Editors/Gen6/SAV_PokedexORAS.cs:236`                  | Asterisk    | 已绑定：pokedex6Edit.give/giveNone；待页面核验                                                                                           |
| `Subforms/Save Editors/Gen6/SAV_PokedexORAS.cs:274`                  | Asterisk    | 已绑定：pokedex6Edit，species=0 的五种全图鉴动作；待页面核验                                                                             |
| `Subforms/Save Editors/Gen6/SAV_PokedexORAS.cs:310`                  | Asterisk    | 已绑定：pokedex6Edit，species=0 的三种形态批量；待页面核验                                                                               |
| `Subforms/Save Editors/Gen6/SAV_PokedexXY.cs:239`                    | Asterisk    | 已绑定：pokedex6Edit.give/giveNone；待页面核验                                                                                           |
| `Subforms/Save Editors/Gen6/SAV_PokedexXY.cs:261`                    | Asterisk    | 已绑定：pokedex6Edit，species=0 的五种全图鉴动作；待页面核验                                                                             |
| `Subforms/Save Editors/Gen6/SAV_PokedexXY.cs:298`                    | Asterisk    | 已绑定：pokedex6Edit，species=0 的三种形态批量；待页面核验                                                                               |
| `Subforms/Save Editors/Gen3/SAV_Misc3.cs:786`                        | Asterisk    | 已绑定：misc3Edit.mirage；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                                         |
| `Subforms/Save Editors/Gen3/SAV_RTC3.cs:74`                          | Asterisk    | 已绑定：rtcEdit.reset；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                                            |
| `Subforms/Save Editors/Gen3/SAV_RTC3.cs:80`                          | Asterisk    | 已绑定：rtcEdit.berryFix；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                                         |
| `Subforms/Save Editors/Gen3/SAV_SecretBase3.cs:211`                  | Asterisk    | 已绑定：secretBase3Edit.trainer；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                                  |
| `Subforms/Save Editors/Gen3/SAV_SecretBase3.cs:229`                  | Asterisk    | 已绑定：secretBase3Edit.member；成功应用工作副本后触发（导出为发起下载后）；待页面核验                                                   |

参考源码只读。行号绑定当前来源版本，窗口不可用操作在浏览器中可能由禁用控件预防，需记录实际对应方式，不能用全局成功提示替代全部调用点。
