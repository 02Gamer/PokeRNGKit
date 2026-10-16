# PKHeX 存档读取与编辑

API178 最终工程门禁：.tmp/pkhex-identity-core.log 浏览器 Core、.tmp/pkhex-api178-native-full.log 默认完整原生与 .tmp/pkhex-api178-verify.log 完整 npm run verify 均退出 0。352 文件／2096 项前端、完整类型、Lint、全仓格式及网页／PWA 构建通过；仅保留 Gen3StaticPanel.tsx:404 原有 Hook 提醒和既有编译／裁剪／包体提示。15 种实体专项覆盖来源编号掩码、先 SID 后 TID 与 UInt32 回绕、转移来源显示、游戏／格式特性目录、实际编号位宽、全部 ExtraBytes 偏移、四布局和完整公开输出。另执行 .tmp/pkhex-api178-real-save.log 的 real-save 专项退出0，确认 E.sav 为 SAV3E／绿宝石，131072 字节、14×30 箱位、20 只箱中／5 只队伍宝可梦；公开读取、编辑、导出重开、其他格位与原件保持通过。原件及工作副本 SHA-256 仍为 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Chrome 4 读取已授权本地页仍失败，真实页面／焦点／下载未验收；设置消费点和其他主窗口行为继续核对，完整目标保留。

## 2026-10-16 训练家编号与开发字段（API178）

基线 013c30aae3e369ab9a2bd4836829f2bd56acc2b1。基础编辑器按实体来源显示五位／六位训练家编号及秘密编号，未修改时保留原始 ID32；新增共用的按需手动特性、特性编号与额外字节面板。存档与独立实体复用三语、共享控件、工作修订和草稿门禁；切换额外字节前须应用或还原当前输入。16 项前端专项、完整类型、定向 Lint 与全仓格式已通过。原生专项的类型比较、跨语言目录排序、Invalid／零版本、上游 internal 常量访问等测试问题已修正；15 种实体、四布局、完整公开输出和新版编号规则已通过，随后补加存档游戏特性上限并重跑。补加游戏上限后的 .tmp/pkhex-identity-native-public-limits.log 专项及 .tmp/pkhex-identity-core.log 浏览器核心均退出0。默认完整原生、完整 npm run verify 和真实存档专项均已通过，实际页面仍未验收。

输入来源：PKHeX.WinForms/Controls/PKM Editor/TrainerID.cs、TrainerTID.cs、TrainerSID.cs、LoadSave.cs、PKMEditor.cs／Designer，以及 Core TrainerIDManager、ITrainerID、ITrainerID32、各实体 ExtraBytes。ID 格式按 TrainerIDDisplayFormat，含转移实体来源世代；十六位控件掩码五位、空值或无法解析为零、上限65535。现代 TID 六位／SID 四位，SID 先写并按旧 TID 校正到4294或4293，TID 随后写入，保留 Core UInt32 回绕与来源 Save6 分支。工具提示含原始ID32、TID16、SID16、按当前格式计算的TSV。

手动特性从第四世代起按源特性目录及 MaxAbilityID；存档入口同时应用当前游戏上限，独立实体按格式上限；第三世代仅原有特性位。PK5 手动修改同步隐藏特性标记。第六世代起特性编号是一位十进制掩码，空值零、0–9 写入具体格式，回读可能受实际存储位宽影响；按编号查找限1／2／4，PA9 使用相遇来源的 ZA personal。额外字节仅列出实体 ExtraBytes，值为三位十进制、空值或无法解析为零、超过255按源限制到255；禁止任意地址。写入先克隆验证，未改异常值保持，不触发通用队伍数值重算。

API177 最终工程门禁：.tmp/pkhex-dimensions-core.log 浏览器 Core、.tmp/pkhex-api177-native-full.log 默认完整原生与 .tmp/pkhex-api177-final-verify.log 修正后完整 npm run verify 均退出 0。351 文件／2080 项前端、完整类型、Lint、全仓格式、网页／PWA 构建通过；保留 Gen3StaticPanel.tsx:404 既有的一条提醒和既有编译／裁剪／包体提示。专项包含六类尺寸实体、五类地形／第四世代实体、全部 256 分类与叶子组合、四布局／完整公开实体、浮点载荷／负零、CP／自动／随机动作、RK4 日期及十组存档／修订版的队伍／箱位或 LGPE 队伍引用对照。默认完整套件带已授权 E.sav 工作副本，原文件 SHA-256 保持 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Chrome 4 读取已授权本地页仍失败，真实交互／焦点／下载未验收；完整接入目标继续保留。

API177 完整网页首轮 .tmp/pkhex-api177-verify.log 退出 1：格式通过，但 react-hooks/refs 将尺寸渲染辅助函数中的随机事件识别为可能在渲染期读取引用。已改为 JSX 内直接生成标量字段与事件，.tmp/pkhex-dimensions-lint.log 的五文件定向 Lint 退出 0；不禁用规则。修正后重跑 .tmp/pkhex-api177-final-verify.log；默认完整原生 .tmp/pkhex-api177-native-full.log 沿同一进程继续，C# 输入未改。

API177 阶段检查：.tmp/pkhex-dimensions-native-floats.log 原生专项、两文件 48 项前端、完整类型、全仓格式及 .tmp/pkhex-dimensions-core.log 浏览器 Core 重建均退出 0。覆盖六类现代尺寸实体及 PK4／BK4／RK4／PK5／PK6 地形记录、全部 256 分类、四布局／公开完整实体输出、随机／重置、手动浮点与 NaN 载荷／负零、冠冕／心情边界、RK4 日期，以及十组存档／修订版的箱位／队伍或 LGPE 队伍引用完整输出。默认完整原生和完整 npm run verify 接续运行，实际 Chrome 页面仍待核验。

## 尺寸／CP 与第四世代记录（API177）

新增 PokemonDimensions 与 PokemonLegacyDetails，存档和独立实体共用两组三语表单、共享字段／按钮及集中草稿校验。尺寸按 IScaledSize、IScaledSize3、IScaledSizeValue、ICombatPower 的实际能力显示，不按世代粗略推断。身高、体重、大小标量为 0–255 的整数；普通尺寸分类调用 PokeSizeUtil，PK9 的大小分类调用 PokeSizeDetailedUtil，PA9 仍用普通分类。随机动作使用 Core 三角分布，仅精确 Ctrl 单击触发，并提供可触摸按钮。

SizeCP.Designer 的三个 NumericUpDown 上限均为 255，下限 0；CP 为五位十进制掩码。SizeCP.MT_CP_TextChanged 的 int.TryParse 成功才写入，并限到 65535，空白或内部空格导致解析失败时不写零。实数框没有数值上下限，按 float.TryParse 解析（含 NaN／Infinity／溢出、负数、科学计数与分组），空白或无法解析不改原值；输出用 InvariantCulture 的 R 格式，未编辑的原始浮点位保持。三个活动 UI 语言的输入均采用该实数语法，前端不另写尺寸公式。

自动计算默认关闭，沿 Designer 未设置 Checked 的状态；开启时执行 ResetHeight／ResetWeight／ResetCP。标量应用时按源事件更新相关实数值，身高更新身高及体重，体重只更新体重，普通大小独立。PA8 的身高与大小双向联动；未触及两字段时保持原有不一致组合。手动模式不重算实际值，CP 可直接编辑。原版可键入但会被自动重算覆盖的实数，在自动模式显示只读。快捷动作有草稿时禁用，先应用或还原。尺寸操作不调用通用队伍能力重算，保留生命／状态等无关数据。

来源：只读 PKHeX.WinForms/Controls/PKM Editor/SizeCP.cs／Designer 的 LoadPKM、TryResetStats、ResetCalculatedStats、LoadStoredValues、标量／实际值／CP 事件、ClickScalarEntry；Core IScaledSize.cs 的接口与 PokeSize／PokeSizeDetailed 工具。枚举分类标签沿来源 XS／S／M／L／XL 等字样，控制标签三语显示。

地形只对 IGroundTile 且 Gen4 原游戏显示，目录用 GameDataSource.GroundTileDataSource。G4PKM 的闪耀叶子五位与冠冕第六位分别编辑；取消任一叶子清除冠冕，新设冠冕需五片齐全，既有异常冠冕可逐步保留／清理。未使用高两位与未修改的异常字节保持。散步心情输入 -127–127，底层 sbyte 原值 -128 未修改时保留。来源为 EditPK4 的 G4PKM 加载／保存、EditPK5／6 的地形条件，ShinyLeaf 控件及 Designer；NUD_WalkingMood.Minimum=-127、Maximum=127。原始字节能力不当作正式表单的替代。

日期可编辑条件改为 G4PKM 而非仅列 PK4／BK4，包含实际保存日期的 RK4；来源 EditPK4 同样接受 G4PKM。沿现有日期控件 2000–2099 与空值清空语义，保留牧场附加字节。接口及版本断言同步 API177。专项、Core 重建、默认完整原生与修正后的完整前端工程门禁均通过，正式页面仍待 Chrome 核验。

API176 最终工程门禁：.tmp/pkhex-special-core.log 浏览器 Core 重建、.tmp/pkhex-api176-native-full.log 默认完整原生、.tmp/pkhex-api176-verify.log 完整 npm run verify 均退出 0。350 文件／2067 项前端、完整类型、Lint、全仓格式与网页／PWA 构建通过；保留 Gen3StaticPanel.tsx:404 既有一条提醒及既有编译／裁剪、包体提示。新专项覆盖 15 种实体的四布局、全部菌株／天数组合、感染／治愈状态表、PK5 邻位／名气、GC 原始零编码、箱位／队伍与两种牧场修订版的完整文件对照；默认完整套件带已授权 E.sav 工作副本检查。最终原存档 SHA-256 保持 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Chrome 4 对已授权本地页的调用仍失败，真实交互、焦点与下载尚未验收；完整接入目标继续保留。

API176 阶段检查：.tmp/pkhex-special-native-ranch.log 原生专项退出 0，覆盖 15 种实体／四种布局、全部菌株与天数组合、感染／治愈切换、PK5 邻位与名气边界、GC 零天数编码、完整输出／原件保持、绿宝石／黑版公开箱位与队伍、剑盾／朱紫类型化块样本及两个牧场修订版的公开手动识别。两文件 46 项前端、完整类型、全仓格式和 .tmp/pkhex-special-core.log 核心重建均通过。接续默认完整原生与完整 npm run verify；Chrome 实际操作仍未验收。

## 特殊状态与记录（API176）

存档与独立文件共用特殊状态表单，新增第三世代起宝可病毒感染记录、治愈状态、菌株与剩余天数，及 PK5 的 NSparkle／PokeStarFame。菌株为 0–15，天数目录由 Core.Pokerus.GetMaxDuration 提供，0 到 (strain & 3)+1；菌株改变时按来源收紧天数。菌株 0／天数 1 仍是可保存组合，不添加来源不存在的“菌株零必须零天数”规则。感染状态使用 Core.IsPokerusInfected（菌株或天数非零），治愈使用 Core.IsPokerusCured（正菌株且零天数）。

感染／治愈复选框使用 Core 动作：首次感染设菌株 1／天数 1；清除感染归零两字段；治愈保留正菌株或将零菌株设 1，天数设 0；从治愈恢复感染将天数设 1。与当前状态相同的动作保持原始值。有未应用草稿时禁用切换，先应用或还原。只改动指定字段，未修改的异常原值及 GC 零天数的原始编码保持；不触发通用队伍能力重算。

能力按实体字段实际可保存性探测并按类型缓存；不把无法正常获得感染当作没有该字段。PB7、PK9、PA9 仍可读取和编辑保存的病毒字节，合法性另由 Core 检查。第二世代沿已有 GB 特殊字段适配器，避免重复表单。所有控件沿共享 Select、check、fieldset 和按钮样式，三语标签及集中草稿门禁同步；稳定挂载并在元数据更新后同步草稿，实际焦点行为待 Chrome 核验。

来源：只读 PKHeX.WinForms/Controls/PKM Editor/LoadSave.cs 的 LoadPokerus／SavePokerus；PKMEditor.cs 的 UpdatePKRSstrain、ChangePKRSstrainDropDownLists、UpdatePKRSdays、UpdatePKRSCured 与 UpdatePKRSInfected；PKM.cs 的感染／治愈属性及 Core.Pokerus.GetMaxDuration。PK5 两字段来自 EditPK5.PopulateFieldsPK5／PreparePK5；Designer 的 NUD_PokeStarFame.Maximum=255，十进制整数、最小 0。NSparkle 只改 0x42 的 bit1，PokeStarFame 使用 0x87 的 byte，IsPokeStar 由大于 250 的名气派生。

Core、Worker 与版本夹具同步 API176。专项、核心重建、默认完整原生与完整前端工程检查均通过；未宣称完整功能或真实页面已验收。

API175 最终工程门禁：.tmp/pkhex-trainer-core.log 的浏览器 Core 重建、.tmp/pkhex-api175-native-full.log 的默认完整原生、.tmp/pkhex-api175-verify.log 的完整 npm run verify 均退出 0。349 文件／2056 项前端、完整类型、Lint、全仓格式与网页／PWA 构建通过；保留 Gen3StaticPanel.tsx:404 既有的一条提醒及既有编译／裁剪、包体提示。原生完整套件包含本批 14 种实体／四种布局、目录／编码／完整输出／原件保持与箱位／队伍检查，并带已授权 E.sav 工作副本的既有工程回归。最终原存档 SHA-256 仍为 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Chrome 4 标签读取再次失败，实际页面／连续操作／下载与所有者验收仍未完成；完整接入目标继续保留。

API175 工程进度：.tmp/pkhex-trainer-native-typed.log 原生专项退出 0，覆盖 14 种实体各四种文件布局、三语目录、完整输出、姓名编码、范围与原件保持；绿宝石箱位／队伍通过公开接口，剑盾／朱紫合成块样本通过类型化适配器，未弱化正式识别。两文件 45 项前端、完整类型、定向 Lint、全仓格式及 .tmp/pkhex-trainer-core.log 浏览器核心重建均通过。最后调整三语标签以区分其他训练家与当前持有者，空姓名禁止选择其他训练家持有。默认完整原生与完整 npm run verify 接续进行，原存档 SHA-256 保持 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442；实际 Chrome 页面未验收。

## 训练家与来源信息（API175）

新增按需读取的训练家目录及共用编辑表单，存档与独立实体两个入口使用同一组共享控件。语言按 GameDataSource.LanguageDataSource 的世代／context 目录，原训练家性别仅允许新增 0／1；当前持有者姓名使用实际 MaxStringLengthTrainer 的 UTF-16 长度，性别及持有者索引均为 0／1。第六世代起提供持有者姓名／性别／归属，IHandlerLanguage 提供语言目录及空值 0。清空或仅空白姓名时沿 UpdateNotOT 将归属、性别归零，保留亲密度与记忆；归属 1 需要非空姓名。

原始国家、省／州及主机地区仅向 IRegionOrigin 显示，与 IGeoTrack 的五条居住历史分别保存。目录复用 Core 的 countries、sr_###、GameDataSource.Regions；新增地区必须匹配选定国家。IBattleVersion 使用同世代可选游戏及 0；IObedienceLevel 使用三位十进制掩码（空值 0、0–999），保存按来源转为 byte，256 为 0、999 为 231；建议值调用 GetSuggestedObedienceLevel 并将相遇等级限制到 0–100。未修改的异常原值保持。

来源为只读 PKHeX.WinForms/Controls/PKM Editor/LoadSave.cs 的 LoadOT／SaveOT、LoadHandlingTrainer／SaveHandlingTrainer、LoadGeolocation／SaveGeolocation、LoadMisc8／SaveMisc8／SaveMisc9；PKMEditor.cs 的 PopulateFilteredDataSources、UpdateNickname、IsPossibleNotNicknamed、UpdateNotOT、ClickGT 与 L_Obedience_Click；Designer 的 TB_ObedienceLevel.Mask=000。语言修改沿来源保留现有任一语言物种名／蛋名；非起名且旧内容不符合来源名字时才使用 Core 物种名。手动起名不自动生成物种名；语言变更按 PreparePK3 的保存顺序重新编码姓名，早期字符集无法表示的文字可能截断，界面明确说明，工作副本可撤销。首轮检查修复了相遇等级 Clamp 重载冲突与独立入口的蛋操作误路由；物种名用例区分没有独立起名标记的早期格式，合成块存档使用类型化检查。

编辑先在克隆上验证后复制，只发送已改字段；不触发通用队伍能力重算。草稿接集中合法性门禁，工作副本版本变化后必须重新读取，避免覆盖其他面板的较新修改。专项、核心重建与完整门禁均通过，结果在进度页记录，实际 Chrome 交互仍待核验。

API174 最终工程门禁：最后核心重建 .tmp/pkhex-stats-final-core.log、默认完整原生 .tmp/pkhex-api174-native-full.log、完整 npm run verify 的 .tmp/pkhex-api174-final-verify.log 均退出 0。348 文件／2046 项前端、完整类型、Lint、格式与网页／PWA 通过；保留 Gen3StaticPanel.tsx:404 既有的一条提醒、既有 .NET 编译／裁剪及包体提示。原存档 SHA-256 保持 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Native 默认套件包含本批六种实体／四种布局、所有来源动作和太晶选项、零 IV 建议差异、隐藏 EV 保留以及七种类型／修订存档的箱位／队伍或 LGPE 队伍引用对照。最后使用稳定挂载同步草稿并条件恢复焦点；实际 Chrome 布局／交互／下载仍未验收。Chrome 4 可被识别，但现有标签读取及同一连接中新建标签均失败；不使用内置浏览器替代工程核验。

后续原生专项 .tmp/pkhex-stats-native-hidden-ev.log 退出 0，包含零 IV 攻击／速度的 AV 最低值及 GV 推荐／满值区别、LGPE 普通昵称编辑完整文件对照与隐藏 EV 字节保留。LGPE 普通模式按来源以 AV 替代 EV 输入，摘要同步显示实际 AV／GV，未发送的 EV 数据保持；三文件 46 项专项 .tmp/pkhex-stats-final-front.log 通过。首轮完整前端检查的 347 文件／2039 项、类型／Lint／格式通过，但网页复制与核心资源替换发生 ENOENT 交叠（System.Linq 压缩资源），该次完整 verify 退出 1，不列为完整通过。最后核心 .tmp/pkhex-stats-final-core.log 已退出 0，资源稳定后重跑 .tmp/pkhex-api174-final-verify.log；默认完整原生 .tmp/pkhex-api174-native-full.log 同时运行。Chrome 4 本地页读取再次失败，实际布局／焦点／下载未验收。

## 世代专属能力与标记（API174）

新增 PokemonAdvancedStats 元数据与编辑动作，存档及独立实体共用三语表单、共享 Select／按钮及集中草稿门禁。按实际实体接口显示 AV／GV、极巨化等级、超极巨、头目、王、原始／覆盖太晶属性；PA9 没有 ITeraType，不虚构太晶字段。只发送修改字段，未修改的异常值与非规范标记字节保持。快捷动作在当前面板有草稿时禁用，先应用再操作；Ctrl+单击数值切换最大／零，Alt+单击清零，Ctrl 优先。随机 AV 的精确 Ctrl／Alt 单键组合分别对应推荐／最低值，其他组合沿随机动作。

输入来源为 StatEditor.cs 的 UpdateAVs／UpdateGVs／ClickAV／ClickGV／UpdateRandomAVs、LoadSave.cs:425–524 和 StatEditor.Designer.cs:742／840／1311。AV 与 GV 均为三位十进制掩码、空值 0，显示输入按各自上限归到 0–200／0–10；Core 请求拒绝新增越界值。GV.GetMax 当前 IV 对应的上限只是提示，保留手动输入 10 的来源行为。六维顺序显式转换为 HP／攻击／防御／特攻／特防／速度；上游 Core 为 HP／攻击／防御／速度／特攻／特防。AV 另接最低、推荐、随机、全满／清零；GV 接建议值、各项当前 IV 上限及清零，均调用 Core 原方法。

极巨化等级目录为 0–10，附来源标签切换端点动作；超极巨／头目／王沿实际接口写位。太晶两个下拉框复用上游同一目录：普通属性 0–17、不覆盖 19（---）、星晶 99。依据 StatEditor.InitializeDataSources／ChangeTeraType 和 ITeraType.cs；不将星晶显示字符串下标 18 写入字段。第一／第二属性和来源切换动作同时清除覆盖；重置覆盖按实体是否 SV 决定用 19 或原始属性。写入先在克隆上验证，异常不改原实体。AV／GV 改变能力值时刷新实际队伍数值并保持当前 HP／状态；PB7 继续使用既有派生能力与 CP 刷新路径。标记与太晶写入保持无关数值。无 RNG 算法或上游源文件改动。

首轮五文件 189 项前端与全仓格式通过，完整类型进行中。原生专项六种独立实体／四布局全部通过，存档阶段的 LGPE 合成样本缺少队伍箱位引用，已沿既有测试的 PartyData 初始化修正并重跑；未放宽产品识别或写入规则。最终完整工程门禁已通过；真实页面继续待核验，不以本批关闭全部主编辑器或完整接入目标。

API173 最终工程检查：.tmp/pkhex-alpha-filter-core.log 的浏览器核心重建、.tmp/pkhex-api173-native-full.log 的默认完整原生，以及 .tmp/pkhex-api173-verify.log 的完整 npm run verify 均退出 0。346 文件／2005 项前端、完整类型、Lint、全仓格式与网页／PWA 通过；保留第三世代定点既有的一条 Hook 提醒、既有裁剪／编译和包体提示。最终原存档 SHA-256 仍为 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Chrome 4 读取已授权本地页仍失败，真实交互／下载与所有者验收未完成；完整接入目标及统计字段余项继续保留。

补查并修正下拉框筛选：来源 FilteredGameDataSource.GetFilteredMoves 与 GameDataSource.LegalMoveDataSource 排除战斗专用及 PLA 未使用招式。Core 为招式目录返回 alphaSelectable，前端只显示可选项；普通写入也按相同 Core 规则拒绝未列出编号，保留旧存档原值可读。修正后 .tmp/pkhex-alpha-filter-native.log 退出 0，逐项对照全部 0–850 编号，与上游 178 项集合完全一致，全部可选／不可选编号均检查，并重跑四布局及完整输出。首轮范围检查与核心构建已通过，但不替代本次筛选修正后的核心重建和完整门禁；后者均已通过，最终结果见本页当前记录。

## 头目初始精通招式（API173）

PA8 的 AlphaMove 新增独立读取、编辑及回读，两正式入口复用 PokemonAlphaMoveEditor、共享 Select 和三语文字，加入集中草稿校验。只有 PA8 返回可编辑字段；保留未列入目录的原值并显示编号，不自动纠正。写入只接受当前 PA8 招式目录 0–850，不要求 IsAlpha 标记为真，不改变该标记。Core 只写 AlphaMove 与校验和，保持当前招式、PP／提升、HP／状态、购买／精通记录和其他数据；箱位／队伍沿原工作副本、撤销与导出路径。

来源：PKMEditor.cs:50／1828–1830／2066／2356、LoadSave.cs:472／484，以及 PA8.cs:241 的 0x3E 小端 ushort 和 MaxMoveID、Legal.MaxMoveID_8a。选项来自既有同格式招式目录，空招式编号为 0；读出的 ushort 原值可到 65535，但越过目录的值不能由普通选择写入。控件名沿 lang_zh-Hans／en／ja.txt 的 Main.L_AlphaMastered。接口、Worker 门禁与夹具统一为 API173，防止旧核心混用。

首轮 .tmp/pkhex-alpha-native.log 退出 0：两种头目标记、四种独立布局、公开 JSON 编辑与回读、完整文件对照，两个 LA 修订版的箱位／队伍完整存档对照、原件不变、无效参数／错误动作／其他格式拒绝，以及未列入目录的原值读取通过。存档对照使用显式类型合成样本，不声称真实 LA 存档识别验收。五文件 168 项前端专项通过；最终完整门禁已通过，详见本页当前记录；页面未验收。

## 主编辑器统计字段的剩余核对

本表记录 API173 审计发现及 API174 接入状态，范围是正式表单；不把底层批量属性能力或图像读取算作对应控件已接，也不声称穷尽全部主窗口控件。来源范围与派生更新已在本页 API174 节核对，真实页面仍待验收。

| 来源字段组             | 当前正式入口                           | 来源与下一步                                                                                                     |
| ---------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 觉醒值 AV、奋斗等级 GV | API174 共用表单已接，保留独立 IV／EV   | StatEditor.LoadAVs／LoadGVs、RefreshGanbaru 与 ToggleInterface；接 Core 上限和能力值刷新，不能将 IV／EV 当成替代 |
| 极巨等级、超极巨化     | API174 已接极巨等级、超极巨及图像联动  | LoadSave 的 G8PKM／PA8 保存路径、StatEditor.CHK_Gigantamax；按实际类型与保存语义接入                             |
| 头目、王标记           | API174 已接头目／王；与 AlphaMove 独立 | LoadSave 的 PA8／PA9 与 StatEditor.ToggleInterface；PA8 的 IsNoble 单独处理，不混同初始精通招式                  |
| 太晶原始／覆盖属性     | API174 已接两个字段及来源快捷动作      | LoadSave 的 PK9、StatEditor.ChangeTeraType（PA9 不实现 ITeraType）；核对默认／星晶值与跨游戏语义                 |

产品对照文件：wasm/pkhex/PokemonEditing.cs、PokemonRawEditing.cs、PokemonTraining.cs、PokemonVitals.cs、SaveSpriteView.cs 和 src/features/saveeditor/PokemonEditor.tsx。API174 的 advancedStats 请求已包含本表字段；主窗口的其他统计／身份控件与批量属性路径仍须逐项核对，不能据此宣称完整接入。

## 集中草稿校验与请求失败反馈（API172 前端）

存档与独立实体使用按宝可梦位置、工作副本修订隔离的草稿注册表；更新上下文时不重挂载经验面板。基础／GB 编辑抽出已有请求构造器用于检查与提交，原始数值沿现有 PID／EC／HOME 解析，经验／状态沿既有掩码与睡眠范围；来源、回忆招式与已加载居住历史按实际目录检查。不可编辑或隐藏的表单不注册，未读取的可选目录不触发后台加载。注册清理由独立令牌保护，旧渲染清理不删除新校验器。

来源为 PKMEditor.cs:235–270 的 EditsComplete／GetInvalidParentTab、Main.cs:1120 和 WinFormsUtil.cs:132–157。共享合法性按钮先检查当前挂载表单，无效时显示三语提示、隐藏旧报告并发 Hand；精确 Ctrl+Shift+Alt（不含 Meta）仅跳过此界面门禁。分析仍读取已应用工作副本，不自动提交草稿，不绕过 Core 写入校验。PA8 AlphaMastered 等专用字段尚未按来源完成对应，不能将此适配标为完整 EditsComplete。

SaveEditorPanel 与独立实体的当前请求失败使用共用反馈：普通错误 Hand，协议不匹配／超时 Exclamation；AbortError 和过期请求无声音。保留现有文字错误与撤销路径。只覆盖这两个请求包装器，不宣称全部 WinFormsUtil 间接调用已迁移。无 Native／Worker 改动，无新增存档数值范围。

首轮四文件 40 项专项与全仓格式通过；完整类型和后续工程门禁进行中。Chrome 4 本地标签读取仍失败，真实交互、焦点与声音待核验。

最终完整 npm run verify 的 .tmp/pkhex-draft-verify.log 退出 0：345 文件／1991 项前端、完整类型、全仓格式、Lint 与网页／PWA 构建通过。已消除本批两条 Hook 依赖提醒，仅保留 Gen3StaticPanel.tsx:404 原有的一条提醒及既有包体／插件耗时提示。Core／Worker 未改，继续复用 API172 默认完整原生基线。Chrome 4 读取本地页仍失败，草稿实际交互、连续焦点与声音未验收；PA8 AlphaMove 确认为独立于招式商店的未接字段，继续作为下一步，不宣称完整接入。

## 交互提示与音效（API172 前端）

依据 WinFormsUtil.Asterisk／Exclamation／Hand／Question 和 18 个剩余直接调用位置，逐项对应见 docs/pkhex-sound-coverage.md。浏览器使用本机合成的四种短音，不复制 Windows 音频；保持 170 ms 与现有音量包络，页面激活前不创建音频，失焦／隐藏／设置变化时停止，三个来源开关独立。新增三语类型选择与试听，复用共享 Select 和既有控件令牌；PlaySoundOther 开关开始消费已连接的操作。

成功型声音只在现有工作副本写入或当前冻结预览确认有效后触发；信件询问按当前预览的队伍引用处理，不自动选择修改持有物。背景拖放只识别 Files 或项目内部格位类型，阻止默认导航／冒泡，不读取负载；格位自身处理后停止冒泡，避免重复提示。表单验证、无效实体分析与不可写目标使用对应反馈，保持文字错误和原有范围校验。无新增存档数值参数或 Native／Worker 协议变化。

首轮前端／类型失败与修正见进度文档；工程重跑中。禁用态、流程适配和实际声音分别记账，集中草稿校验与间接对话框仍在范围内；不得将这些说明当作所有者验收或完整接入。实际 Chrome 音频、拖放和弹层交互待核验。

最终十文件 287 项与定向 Lint、完整类型通过；.tmp/pkhex-feedback-verify.log 的完整 npm run verify 退出 0（343 文件／1966 项、类型、格式、网页／PWA）。保留第三世代定点模块既有的一条 Lint 提醒及既有包体提示。Core／Worker 未改，不重复运行相同版本原生基线；原存档哈希保持。外部 Chrome 页面读取仍失败，音频与拖放的真实行为待核验，不能由模拟事件测试推定浏览器投递不可写目标的 drop。

## 共用经验值、状态与觉醒力量（API172）

新增 PokemonVitals 元数据与处理，由存档和独立实体共用。GB 通过 GbSpecialEdit.vitals，其他格式通过 PokemonRawEdit.vitals，继续沿原工作副本／撤销／写入回读。PokemonReader 逐只返回实际成长曲线边界、状态存储能力及觉醒力量目录，Worker／协议统一为 API172。EntityEditor.HiddenPowerOnChangeMaxPower、ShowExperienceBar、ShowStatusCondition 和 ShowGenderGen1 均已接消费；第一世代性别同时影响详情与悬浮预览，设置变更仍沿既有报告重读及悬浮失效路径。

输入依据为 PKMEditor.Designer.cs 的 TB_EXP 七位十进制掩码、TB_Level 三位掩码及 PKMEditor.UpdateEXPLevel。经验输入 0–9999999，普通模式按 Core 的实体成长曲线限制到等级 100 基础经验值；等级 1–100。经验条端点、Alt／Shift／Ctrl 优先级、滚轮跨级与至少一经验的步长沿 ExperienceBar.cs，浏览器不另写成长曲线。Width 1–16384 是浏览器协议的几何资源限制，不宣称为原 WinForms 控件范围。共享滑条提供方向键、Home／End 和 PageUp／PageDown 的可访问操作，另提供对应动作按钮；隐藏经验条不隐藏原经验值输入。

异常状态沿 StatusConditionView／StatusBrowser，仅改低八位，第四世代及以前使用 StatusCondition，之后映射 StatusType。睡眠 1–7 回合，剧毒只在第三／第四世代目录出现；保留当前 HP 与状态高位。是否保存状态由克隆的实际存储／队伍序列化差异判断；PK2 独立文件为完整列表，但存档箱位只有 32 字节，不把其独立列表长度当成箱位宽度。SK2／RK4 不保存状态，明确关闭写入并说明。PartyStatsPresent 为 false 时不显示状态图像；濒死来自 HP 为零，选择无异常状态不恢复 HP。状态图示与浏览器选择沿上游各自的优先级，不强行统一异常组合。

觉醒力量使用 StatEditor.UpdateHPType 原路径：可用范围为格式不高于第七世代或 PB8；16 类型下标 0–15，来自属性目录 1–16；威力仅第五世代及以前显示。按当前设置决定是否填满 MaxIV，再调用 HiddenPower.SetIVs(type, ivs, Entity.Context)，使用原 Core 顺序及 GB DV 派生。等级／IV 更新保留原 HP 上限夹取及状态，LGPE 派生数值继续使用原共用刷新。七张 sick 状态原图与来源哈希已加入本地资源；无运行时外链。

九文件 198 项前端及定向 Lint 已通过；原生专项和完整类型／格式仍在运行，浏览器核心及网页尚未重建。首轮失败及重跑记录见进度文档，不以代码接线或专项代替全量工程检查和真实页面验收。

后续专项 .tmp/pkhex-vitals-native-storage.log 已退出 0：18 格式／两种文件布局、全部可用觉醒力量类型与设置、等级／经验／状态的公开接口完整输出、经验条动作、GB 箱位与队伍、真实 E.sav 工作副本均通过。CK3／XK3 状态为非序列化自动属性，RK4 setter 不写入，SK2 状态也不在记录中；G8／G9、PA8／PA9 的状态偏移位于箱装记录内，按实际序列化开放，不根据世代概括。空经验及掩码空格按 0，空等级与超界三位输入归到 1–100，非法非掩码字符拒绝；Native 请求等级仍限制 1–100。前端复核九文件 199 项／Lint 与浏览器核心构建通过，首轮类型检查通过。最后增加连续滑条操作的草稿同步、折叠保持与有条件焦点恢复；完整工程检查和真实页面仍待完成。

最后代码的默认完整原生 .tmp/pkhex-api172-native-full.log 与 npm run verify 的 .tmp/pkhex-api172-verify.log 均退出 0：341 文件／1945 项前端、完整类型、网页／PWA 与格式通过，Lint 无错误，仅保留第三世代定点模块既有的一条依赖提醒。浏览器核心已重建，真实 E.sav 原件 SHA-256 保持。Chrome 4 本地页面读取仍失败，连续键鼠操作、实际布局、下载与所有者验收尚未核验；此记录只证明工程检查完成。

## 竞技场二代与牧场实体适配（API171）

新增 SK2／RK4 独立文件读取、基础编辑与导出，并接通竞技场二代／牧场存档内的共用编辑入口。SK2 沿 GBPKM 与 ICaughtData2 处理 DV、能力经验、招式、相遇、病毒及蛋字段，不经 PK2 中转；日文／国际版存档使用实际存档编码，独立文件沿 Core 构造器推断编码。租借标记及保留位保持，租借宝可梦不存训练家姓名，三语界面说明并禁用该输入，服务端拒绝改写。RK4 沿 G4PKM 编辑，保留标准记录以外的 28 字节牧场资料，原 Core 负责前 136 字节的加密与校验。

输入依据：PKHeX.Core/PKM/SK2.cs、RK4.cs、PKHeX.WinForms/Controls/PKM Editor/EditPK2.cs、EditPK4.cs，以及 SAV2Stadium.cs／SAV4Ranch.cs。SK2 固定 60 字节，DV 0–15、能力经验 0–65535、PP 0–63、PP 提升 0–3、等级 1–100、TID 0–65535；名称沿实体 MaxStringLength，未改动的空名称保留。相遇等级 0–63、地点 0–127 且取来源目录、时段 0–3、训练家性别 0–1、病毒菌株／天数 0–15 并检查持续期。RK4 固定 164 字节，复用第四世代字段范围；文件选择与模板协议同步接受 .sk2／.rk4，API 与 Worker 统一为 171。

原生专项 .tmp/pkhex-stadium-ranch-native-final.log 退出 0：SK2 日文／国际与租借四组合、RK4 基础／进阶／四种导出布局、竞技场二代两个区域、牧场及白金更新版，逐项完整字节／校验／回读与输入保持，并追加既有 GB 基础／特殊字段回归。首轮日版样本缺少 P3v0 区域识别标记，按来源补齐合成样本后通过，未放宽产品识别或校验。十文件 248 项前端、定向 Lint、完整类型与全仓格式通过；i18next 选项修正后五项专项再次通过。浏览器核心与网页构建继续核验，真实页面尚未检查，不作所有者验收或完整接入结论。

最终浏览器核心构建通过（.tmp/pkhex-stadium-ranch-core.log）。默认完整原生回归 .tmp/pkhex-api171-native-full.log 与完整 npm run verify 的 .tmp/pkhex-api171-verify.log 均退出 0；340 文件／1935 项前端通过，完整类型、网页／PWA 与格式通过，Lint 无错误且保留第三世代定点模块原有的一条 Hook 依赖提醒。Chrome 4 本地页读取仍失败，真实页面及所有者验收保持待核验。

剩余实体编辑入口的来源已核对，尚未实现：PKMEditor.Designer 的经验值为七位十进制掩码、等级为三位，PKMEditor.UpdateEXPLevel 使用实体成长曲线与 Core Experience，普通模式在等级 100 截至该级基础经验值，等级输入限制 1–100。ExperienceBar 的拖动只改当前等级内经验，滚轮允许跨级，Alt／Shift／Ctrl 组合分别执行等级起止、升降级等来源动作。后续应由 Core 返回曲线边界并执行变更，浏览器不另写成长算法。

StatusConditionView 保留状态值高位，仅替换低八位；第四世代及以前使用 StatusCondition，之后使用 StatusType。StatusBrowser 睡眠回合为 1–7，剧毒仅第三／第四世代显示；濒死来自当前 HP 为零，不能将清除状态写成恢复 HP。缺少 PartyStatsPresent 时来源清空图示，各格式／存储宽度是否真正保存状态仍须逐一验证。StatEditor 的觉醒力量有 16 个类型（目录下标 0–15，对应属性表 1–16），格式不高于第七世代或 PB8 显示，威力仅第五世代及以前显示；选择类型先按设置决定是否填满 IV，再调用 HiddenPower.SetIVs(type, ivs, Entity.Context)。ShowGenderGen1 同时影响编辑器及悬浮预览，不能只开放设置开关。

## 存档内宝可梦编辑能力（API170）

SaveReport 新增 PokemonEditing，分别声明 CanEdit、Editor、CanRaw、CanImport、CanStorage，原 CanEdit 保留既有训练家／背包／整箱等行为。支持实体适配、拥有队伍或箱子、可导出且存档校验正确时才允许对应写入；锁定位、位置、实际实体与各字段约束仍在原处理函数独立检查。GB 使用专用接口，拒绝误用后续世代的普通编辑请求；标准／GB／不支持三种界面不会互相套用。Worker 核对新增能力及 API170，UI 不以识别成功推断可编辑。

GB 基础处理从 StandaloneGb.Edit 提取为 Apply，由文件和存档共用，不复制域规则。范围沿既有 `PKMEditor.EditPK1／EditPK2`、`StatEditor.ToggleInterface`、`MoveChoice` 与 Core PK1／PK2：种类 1..MaxSpeciesID、等级 1..100、TID 0..65535、四个 DV 0..15、五项能力经验 0..65535、四招式 0..MaxMoveID、PP 0..63 且不超过 Core.GetMovePP、PP Ups 0..3，空招式的 PP／PP Ups 为 0。昵称／训练家姓名使用实际地区布局 MaxStringLengthNickname／MaxStringLengthTrainer，空名和无法往返编码字符拒绝；二代亲密度 0..255、道具沿自身 MaxItemID。类型、捕获率、相遇、病毒、蛋和语言继续沿 StandaloneGbSpecial 的原上下限与跨字段规则。存档请求的 JSON 长度上限 32768 是本地资源边界，不是上游文本控件宽度。

写入只修改解析后的独立对象，用 EntityImportSettings.None 避免额外导入行为。导出后按当前手动识别与 BR 角色上下文重开，核对格式、校验和、队伍数及完整格位数据。GB 格位使用 Core.PokeList1／2.GetListLength 与 WriteToList，比较真实容器头、名称与队伍／盒装宽度；不能把 SIZE_STORED 当作 PKM.Data 的长度。LGPE 的 ResetCalculatedValues／ResetCP 与能力变化后的队伍状态刷新移入共用编辑函数，使存档和独立文件行为一致，保留原健康值与状态策略。

竞技场日版初作单独适配：Core.SAV1StadiumJ.GetPKM 读取 33 字节原始 PK1、6 字节昵称、6 字节训练家姓名；继承写入器却调用 PK1 单只列表写出。项目侧 PokemonSlotWriter 按 GetBoxSlotOffset 与 SIZE_STORED 定位，使用该读取器的逆布局并核对总宽度，按原存储规则更新 Stat_LevelBox，不改 Core。编辑／导入／仓储共用，拒绝非日文 PK1，Core.Write 负责校验和与最终容器。原生完整文件对照和读回覆盖此修复。

手动识别增加版本／语言组合约束。Core.SAV2Offsets.LoadOffsetsKorean 的 Gender 为 -1，SAV2.Version=C 的 Gender getter 却会访问该偏移；因此 GSC／C／Korean 在构造前明确拒绝。目录返回 Unsupported 对，前端据该目录禁用组合并三语提示，不在 JS 推测地区枚举值。其他组合保持来源目录与原语义。完整手动识别及六类容器回归通过。

早期现代样本缺少自动识别签名、秘密箱布尔块及完整日期／游戏时长标量类型，已复用现有显式识别和类型正确的工程夹具，未扩展生产检测或跳过完整读取。最终现代格式、银行／盒子／BR／竞技场、支持的 GB 区域布局、整文件输出／回读／原件保持以及共用独立文件回归退出 0（.tmp/pkhex-save-pokemon-native-slot.log）；九文件 243 项前端、定向 Lint、完整类型、浏览器核心与网页／PWA 构建均通过。全仓格式与 diff 已通过，最后文档批次再清理；所有编译任务已结束，Chrome 4 读取已授权本地页仍失败。原 CanEdit 与新增能力保持独立，不开放未适配的 SK2 等实体。实际页面、键盘／触摸、主题及下载仍需外部 Chrome 核验，不将工程证据写作所有者验收。

## 图示球种选择（API169）

来源为 `PKHeX.WinForms/Controls/PKM Editor/BallBrowser.cs` 的 LoadBalls／GetBallView／SelectBall、`PKMEditor.cs` 的 ClickBall，以及 Core `Editing/Applicators/BallApplicator.cs`。存档与独立实体共用 PokemonOriginEditor；展开来源编辑、读取目录后可展开图示球种选择。复用本机 `_ball<ID>` 图像和源 BallDataSource 的三语名称，不新增外部资源请求。

选择器按实体 `MaxBallID` 列出整数 ID 1..MaxBallID，与来源 byte 循环一致；零值仍可在既有下拉框保留。球种不是自由数值输入，没有空字符串、独立字符宽度或推测的 Designer 数值上限。协议预览参数仅允许整数 0..255，再调用实际格式 setter；CurrentBall／StoredValue 返回读回值。尤其 `PKM/Shared/G4PKM.cs` 的 Ball setter 根据版本、配信与双字段规则将不能保存的球种调整为精灵球，UI 随该实际值更新，不在预览时写入源实体。

Core.GetLegalBalls 及 ApplyBallLegalByColor 仅作用于克隆。LegalFirst 默认 true，消费原 EntityEditor.ShowLegalBallsFirst：稳定地将通过项前移，各组内保留球 ID 顺序，关闭则完整按 ID 排列。未通过项仍可选择；此结果只涉及球种，不等于整只宝可梦合法。显式颜色推荐／恢复按钮提供桌面 Shift／Alt 点击的可访问对应；普通选择、快捷操作和显式按钮均先更新草稿与目录，应用才写工作副本。草稿版本／球种变化重新检查，设置修订变化使旧目录失效，迟到／退出请求沿序号保护。

Worker 协议升级 API169；存档及独立文件目录均核对完整三语、唯一 ID、完整 1..N 球种范围、稳定排序与字节值范围。内部来源写入校验不重复计算仅用于显示的球种合法性，不改变原有球种／版本／地点范围和导出回读约束。单纯读取目录保留未列出的原始球种草稿，明确改球或版本时才采用 Core 读回值。14 格式及合法上游夹具、真实 E.sav、两种排序、Core 完整输出、公开独立文件编辑导出重开和跨版本预览专项最终退出 0；十文件 231 项前端、定向 Lint、完整类型、浏览器核心及网页／PWA 构建均通过。全仓格式和 diff 已通过，最后文档批次再清理；实际 Chrome 布局、键盘／触摸、主题及交互未核验。

上述存档入口仍受既有 report.canEdit 控制。当前通用 CanEdit 未包含 SAV1／SAV2／SAV7b／SAV8LA／SAV9SV／SAV9ZA／SAV4BR；各格式专属编辑器和独立实体可用，不等于这些存档中的普通宝可梦表单可写。后续须以各路径的真实读取、队伍／盒装写入与完整回读拆分能力，不复用一个全局开关放开不支持的训练家或其他编辑器。

## 宝可梦模板创建（API168）

来源为 Main.LoadBlankSaveFile／ResetSAVPKMEditors、SettingsEditor.CB_Blank、Core BlankSaveFile.Get、EntityTemplates.TemplateFields 及 SaveExtensions.LoadTemplate。默认版本目录沿 VersionDataSource 排除 0／GO／CP；不自行拟造版本数值。新工具创建独立实体，保留源模板的招式、球、日期、种类、语言、默认训练家身份和 GB 尾部规则，进入已有单体编辑／校验／导出，不导出空白游戏存档。源存档语言参考使用原 GetSafeLanguage／GetSafeTrainerName，默认身份仍为 PKHeX 的身份，不冒称沿用玩家姓名和 ID。

部分 SAV 格式 Version 是组值，TemplateFields.GetTemplateVersion 会选择组内版本；保留该行为。原生比较先验证版本属于来源组，再仅对齐两次独立选择的版本字段后比较每个序列化字节。目录中 41 个版本的默认／自定义及名称不匹配回退已通过，来源上下文／路径与默认版本亦通过；追加异常大小、空模板、无效数据拒绝及真实 E.sav 原件／输入保持专项退出 0。

模板分类沿已保存 TemplatePath，空白对应 local，斜杠与末尾分隔符统一；只匹配该分类下的“末级分类名.PKM格式”，文件名比较忽略大小写，不扫描磁盘或递归子分类。按上游 EntityDetection／EntityFormat／EntityConverter 读取与转换，找不到或不能识别时使用 Core 默认字段。模板文件沿独立实体的 1 MiB 产品上限，库沿已有 1024 文件／单文件 64 MiB／总量 128 MiB、名称 4096 字符与分类 32767 字符；创建 API 的 JSON 上限 2 MiB。版本和目录输入通过共享设置与下拉框，不增加推测的 Qt／WinForms 数值范围。

库操作只替换唯一匹配文件，重复候选不任意选取。保存前先以 Core 验证所选文件可作为当前格式模板，使用全库快照 CAS 保留其他分类与同时更新；移除可撤销，撤销同样拒绝冲突。独立模板编辑器与已有存档／独立文件编辑器并存，不在再次创建时默默替换未导出的编辑。切换工具期间保留编辑，关闭需要明确丢弃确认。只读来源有哈希及 Worker 调用前后字节核对，设置或源文件变化取消旧读取。九文件 217 项前端、定向 Lint、完整类型、核心及网页／PWA 均通过，首轮 Lint 生命周期提醒已修正。日志 .tmp/pkhex-entity-template-{native-real,front-final,lint-final,types,core,web}.log；最后文档格式与 diff 继续清理，Chrome 页面读取仍超时，真实页面与 IndexedDB 交互未核验，不作为所有者验收。

## 对战文本导入（API167）

依据 Main.cs:452–484 与 PKMEditor.cs:2221–2226。沿 ShowdownParsing.GetShowdownSets 解析第一组并使用 PKM.ApplySetDetails，保留上游的种类限制、能力值、性格、道具、招式、PP、异色／加密常量、记录旗标与队伍状态等联动；不以自行拼字段替代原 Core。上游 BattleTemplateTeams.TryGetSets 会解析联网团队网址，静态本地架构改为显式粘贴文本后纯本地解析，不主动请求外网。

预览冻结完整文件输出及前后文本、解析文本、PID／加密常量、变化字节、三语 InvalidLines。确认校验源／目标哈希、位置、设置与存档上下文，冻结结果一次消费，不重新运行随机应用。解析问题显示并要求明确确认，保留上游仍可应用已识别数据的能力。输入文本与目标变化或离开视图时丢弃旧预览；工作副本更新沿现有撤销栈，原件保持。

目标箱子／格位来自当前报告；可选择空箱位，队伍仅列真实 PartyCount 的格位。Core 复用 PokemonEditing.Read 和 StorageEditing.Writable，保存时回读并核对实体、队伍数与校验和。GB 使用完整名称／列表容器比较，不按 PKM.Data 的原始长度误切。文本输入上限 1048576 UTF-16 字符、Native JSON 上限 7 倍加 4096 是明确的浏览器资源限制，上游剪贴板无对应控件上限。13 组游戏样本、全部 16 种独立实体、GB 中日文队伍／箱子与真实 E.sav 工作副本专项最终通过。GB 比较使用 PokeList1／2.GetListLength 与 WriteToList 的 isParty 参数，保留实际列表头、名称、蛋标记和存储字段；不比较盒装不会保存的队伍专用字节，不放宽其他断言。核心构建通过。正式视图改为共享导入／导出模式按钮，退出导入模式时丢弃预览；最终八文件 208 项前端、定向 Lint、完整类型、网页／PWA 和全仓格式／diff 均通过。追加三语回导、仅第一组、空／超限输入拒绝及前述全部原生专项退出 0，原件 SHA-256 未变。日志 .tmp/pkhex-battle-import-language.log、.tmp/pkhex-battle-import-front-final.log、.tmp/pkhex-battle-import-types-final.log、.tmp/pkhex-battle-import-core.log、.tmp/pkhex-battle-import-web.log。最后文档再清理格式；Chrome 页面读取仍超时，页面待核验，不将工程检查写成完整接入。

## 对战文本导出（API166）

来源 Main.cs:486–503 与 SAVEditor.cs:1389–1409，直接使用 Core ShowdownParsing.GetShowdownText 和 GetShowdownSets。保留单只 InterpretAsPreview 与集合导出路径的来源差异，集合按来源以两个环境换行分隔，空种类由 Core 跳过。提供单只、队伍、单箱、全部箱子与独立实体读取；三语文本以当前界面语言作为 GetSettings 的回退，模板固定语言优先，不自行翻译文本内容。

新增 JSExport／Worker／正式工作区与独立实体面板。范围没有新增自由数值输入：宝可梦与箱子均从当前报告选择，Core 使用 PokemonEditing.Read 校验 0..PartyCount-1、0..BoxCount-1、0..BoxSlotCount-1；集合只在对应 HasParty／HasBox 时读取，不兼容的参数组合拒绝。请求 JSON 上限 1024 字符是浏览器协议边界，不宣称 Qt／WinForms 控件范围。输入与来源哈希保持，复制只在显式按钮触发且非空；离开或切换版本后不展示旧结果。

模板语言、四类能力值格式、招式格式、Champions 点数、预置／自定义顺序直接消费原 Core 的 BattleTemplateTypeSetting.GetSettings，悬浮模板沿已有 PokemonHover。StatsCustom 属性在提供的上游版本中没有实际读取，暂不开放这些子字段。原生专项对照七种存档的完整三语结果、三种顺序、固定／跟随语言、队伍和独立文件，另测输入保持与参数拒绝。原生最终专项、追加三种能力值格式／方向招式／Champions 点数及真实 E.sav 的三语完整文本与数量比对均退出 0；真实副本和原件哈希保持。八文件 194 项前端测试、定向 Lint、完整类型、浏览器核心及网页／PWA 均通过，全仓格式与 diff 已通过，最后文档再格式清理。Chrome 4 标签读取仍超时，浏览器页面未核验；文本导入仍属后续缺口，不将此导出入口视为整个对战文本工作流完成。日志 .tmp/pkhex-battle-template-real.log、.tmp/pkhex-battle-template-front.log、.tmp/pkhex-battle-template-types.log、.tmp/pkhex-battle-template-core.log、.tmp/pkhex-battle-template-web.log。

## 存储关联合法性检查（API165，工程核验中）

来源为 `SAVEditor.ClickVerifyStoredEntities` 与 Core `Legality/Bulk/BulkAnalysis.cs`。此前单只报告、资料库及报表不能代替此功能：来源还运行跨条目的克隆、训练家、PID、加密常量、处理训练家和配信检查，并通过 SaveFile 构造器追加存档专属的合体与唯一道具检查。输出的 Clean 只表示这些存储关联检查通过，不代表所有单只宝可梦的完整合法性。

原生服务 `SaveService.AnalyzeStoredPokemon` 已加入内部开发，直接调用原 Core 的 SaveFile 重载，读取当前 `Legality.Bulk.CheckActiveHandler`，返回来源哈希、实际分析条目数、发现数与完整三语报告。空格、异常物种和坏实体校验和按 Core 原规则排除；空存档沿来源的 clean 分支，不调用会访问 AllAnalysis[0] 的详细报告函数。无新增数值输入或过滤范围；浏览器入口沿现有存档读取的 1 byte–32 MiB 限制。

首次专项在数据保持断言失败。原因是 GBA 的 `CloneInternal` 调用 GetFinalData，会执行扇区序列化；已移除该克隆，改为仅分析现有 SaveService.Open 创建的独立 SaveFile，不序列化或写回输入。保留原数据断言，未修改 Core 源码。最终专项覆盖 11 格式、两种处理训练家设置、空存档、克隆和坏校验和排除；真实 E.sav 的 25 个条目及三语报告均与独立 Core 调用一致，输入／原文件保持。

现已公开 JSExport 与 saveBulkLegality Worker 请求，协议升级 API165。正式存档工作区在宝可梦分组增加存储关联检查，按需运行、三语结果和显式复制报告，沿共享控件与滚动区域；bulk.checkActiveHandler 设置开放。Worker 对调用前后字节计算 SHA-256，校验原生报告来源与版本；主线程再次绑定当前工作副本和操作编号，视图退出后忽略迟到结果。复制成功且视图存活后消费来源 Other 提示，分析返回不新增该提示。下一步运行专项、重建浏览器核心和网页并核验，不能标记整体功能完成。原生日志为 `.tmp/pkhex-bulk-legality-native.log`（首次失败）与 `.tmp/pkhex-bulk-legality-native-final.log`（退出 0）。

追加未修改的上游合法 Castform PK6 夹具，来源路径与 SHA-256 记录在 `third_party/pkhex/legality-fixtures/README.md` 和 source-manifest。它保留单只合法性，通过改变测试存档身份形成处理训练家不匹配；启用 CheckActiveHandler 时发现关联问题，停用时 clean，从而验证设置实际改变 Core 结果。追加专项 `.tmp/pkhex-bulk-legality-policy.log` 退出 0，原 11 格式和真实存档检查同步通过；完整来源清单 3555 文件哈希核验及设置页定向 Lint 通过。此处为原生专项证据；API165 新核心构建、前端检查与页面结果在下文另记，不扩展为所有者验收。

API165 公开接线专项 `.tmp/pkhex-bulk-public-native.log`、六文件 172 项 `.tmp/pkhex-bulk-public-front.log`、定向 Lint、完整类型及浏览器核心构建均退出 0。前端覆盖精确字节视图哈希、旧版本／旧来源／坏字段拒绝、三语只读动作及 Worker 取消释放。核心保留已有反射裁剪警告；网页／PWA、最终格式与 diff 已通过；完整 npm run verify 退出 0（333 文件 1837 项），日志 .tmp/pkhex-bulk-public-verify.log。完整默认原生回归最终退出 0（.tmp/pkhex-bulk-public-native-full.log），本批所有检查任务均已结束。Chrome 列表及已授权本地 URL 直接读取仍超时，未取得本批页面证据，不能视为所有者验收。

## 单只合法性报告复制保护（2026-10-16）

共享 PokemonLegality 消费来源 Main.cs:1177：当前报告完整文字复制成功后播放 Other 提示。复制期间禁用重复操作，报告／格位／语言／视图变化后忽略迟到成功或拒绝，不显示旧状态或播放提示。存档和独立宝可梦共用，无新增输入或 Core 变动。四文件 20 项专项、定向 Lint、完整类型及网页／PWA 构建通过，格式与 diff 已通过；本段文档更新后再做格式清理。Chrome 页面交互仍待核验，整体目标未完成。

## 加载与合法性提示音（2026-10-15）

- 来源为 `Main.OpenSAV` 的 PlaySoundSAVLoad 和 `Main.DisplayLegalityReport` 的 PlaySoundLegalityCheck，均调用 SystemSounds.Asterisk。存档工作副本成功打开后，以及存档／独立宝可梦合法性报告成功返回后触发；迟到或失败请求沿既有操作编号保护不播放。两个设置分别消费，其他提示音仍待逐项接线。
- 浏览器不能调用 Windows 系统声音，采用本机生成的 170ms 短提示作为平台对应，不携带 Windows WAV。新提示替换旧提示，音量以包络渐入／渐出；不与叫声启用状态捆绑，不改变原有叫声资料。
- 设置页新增独立三语页级启用／停用和试听控件，默认关闭，只在用户点击后创建并恢复 AudioContext；策略仅保留当前页面。隐藏页面、设置变更或停用时停止，迟到启用不能重新打开已停用播放器，浏览器拒绝音频时显示错误而不影响存档操作。
- 本批只开放 Sounds.PlaySoundSAVLoad／PlaySoundLegalityCheck。PlaySoundOther、其他系统提示类型及其调用点尚未接入，不以这两个事件代表全部声音。工程检查见进度；外部 Chrome 实际播放及听感尚未核验。
- [其他提示音清单](../pkhex-sound-coverage.md) 记录当前来源 164 个直接调用位置；各项标记实际对应状态，尚不含通用消息函数内部路径，不以全局成功通知替代原调用条件。

2026-10-15 首批 Other 接 5 个直接来源位置：用户搜索和重置、逐个定位找到／未找到、Notify=Silent(1) 的箱子导出。成功提示使用上行短音，未找到使用下行短音，均为浏览器对应；后台自动刷新、失败或迟到请求不播放。导出只在既有下载分支成功发起后读取静默策略，声音偏好错误不得改变导出状态。PlaySoundOther 独立消费，但设置入口继续禁用，剩余 159 个直接调用及通用消息路径未齐。实际播放和听感仍待外部 Chrome 核验。

2026-10-15 追加相遇／配信的 6 处来源：两个窗口的用户搜索完成和手动重置，以及相遇条件的重置／从编辑器读取成功。翻页、窗口初始化、失败及卸载后的返回不触发；手动应用条件不新增来源没有的提示。配信搜索同时核对请求开始时的资料版本，目录／设置／配信资料变化后拒绝旧结果及声音。对应 `SAV_Encounters.cs:133/139/329/512` 与 `SAV_MysteryGiftDB.cs:276/392`；累计 11 处已绑定，另 153 处与通用消息路径仍待处理，PlaySoundOther 设置入口继续禁用。候选只渲染实际结果，未将桌面空白图片框的越界点击提示套用到正常候选选择。

2026-10-15 实体资料库追加 `SAV_Database.cs:263/316/554` 的删除成功、手动重置及用户搜索完成提示。删除须先完成冻结确认和存档／本机资料提交，存储失败不播放；查找取消旧预览前后、返回结果及提交前后核对资料版本，防止目录／设置切换后恢复旧列表或提交提示。翻页和初始化不播放，其他提交动作不增加删除提示；重置沿既有 `newPokemonSearch` 清空指令与筛选，保留来源范围。累计 14 处已绑定，另 150 处与通用消息路径未齐，PlaySoundOther 设置入口仍禁用；浏览器操作及声音待核验。

2026-10-15 第二至第四世代再接 20 处直接来源。`saveEditHasSound` 仅列已核对的请求类型与动作：GS 球事件、名人堂导入队伍、幻岛、RTC 重置／树果修复、秘密基地训练家／队伍成员、电话簿全部／非训练家／清空、运动场奖章全部／清空、宝可表全部、封印／饰品／背景全部或合法项、第四世代图鉴五种全物种批量、录像导入及对战通行证导入。统一在既有 applyWorkingEdit 完成 Core 回读、工作副本更新和操作编号核对后播放；单项字段、清空饰品、重新保存、普通应用等未列动作继续静默。录像导出在现有下载分支发起后播放，失败不触发。不新增输入或改动 Core 算法。

资料库取消预览另补代次核对，迟到的取消不得清除新资料上下文中的预览。来源清单累计 34 处已绑定；三个候选窗口的 6 处空白图片框越界提示记录浏览器平台对应，网页只渲染实际结果，Core 的 Row／At／Results 索引检查保留，不给正常候选选择增加错误音。其余 124 处直接调用及通用消息内部路径未齐，PlaySoundOther 设置入口继续禁用，工程与页面证据分开记录。

2026-10-15 第五世代追加 13 处来源。图鉴按单物种 give／giveNone、全图鉴五种动作及三种形态批量分别对应，字段编辑和不存在的 DexNav 动作不加提示；奖章只处理全部领取、导入、栖息地完成／清空和等级计算，杂项只处理森林随机填充和解锁装扮。以上沿成功应用工作副本入口；加盟大道实体导出在既有下载发起后播放。

下载内容和 C-Gear 原始文件在 Core 导入预览成功后提示，确认保存不重复；对应来源 ImportFile 已完成尺寸检查后的提示。C-Gear 图片转换沿 `SAV_DLC5.CheckResult<CGearBackground>` 及 Core `CGearBackground` 的 16 色／255 图块，只在 Core 返回非负整数且不超限时播放成功音；超限仍保留原转换预览与警告，不改变图像算法或导出限制。图像尺寸、像素数据与颜色统计继续来自原 Core；未在 JavaScript 重算。累计 47 处已绑定、6 处平台对应、111 处直接调用待接，通用消息路径仍待处理，PlaySoundOther 设置入口继续禁用。

2026-10-15 第六、七世代追加 23 处来源。第六世代接图鉴单种／全图鉴／形态三类操作（XY 与 ORAS）、训练家饰品和秘密基地导入。第七世代接全图鉴五种动作、LGPE 捕获计数批量／求和、SM／USUM 豆子填满／清空、集齐细胞、服饰、GO Park 删除单格／全部、称号／服饰、批量导入与摘要，以及圆庆广场眼镜。

普通动作仍在原工作副本成功应用后提示；食物操作额外核对结果格式，豆子提示不作用于泡芙、宝可方块或宝芬。GO Park 单只导入和普通字段保存不加提示；批量导入仅在 Core 预览 receipt.unplaced 为空时传来源标记给成功提交回调，保留原版容量不足提前返回而无结束提示的条件。圆庆广场只为当前冻结预览中的 glasses 动作传提示标记，不给其他提交加音；这两个标记仅在 React 回调之间传递，不加入 Worker／Core 请求。预览本身、失败与迟到结果不播放。

GO Park 空摘要现在显示已有三语 noEntries 信息，不向剪贴板写空字符串；非空摘要只在浏览器写入成功且视图存活后提示，失败继续显示可手动复制文字。圆庆广场超长十六进制字段采用已存在的 maxLength=24／8／8 与 Core 校验对应原截断保护，不为合法输入发声。累计 70 处已绑定、7 处平台对应、87 处直接调用待接；第六世代箱子移动边界提示仍待核对，不以原有整箱交换代替该调用。PlaySoundOther 总入口继续禁用，真实页面与剪贴板权限／声音待外部 Chrome 核验。

2026-10-15 第八世代再接 29 处来源，继续使用已核对的请求类型／动作表与成功应用入口。剑盾包括单种 Give、全图鉴五种动作与全部战斗次数，训练家包括队伍复制到卡片／标题、服饰和地鼠；LA 只为研究报告提示，不给高级研究或条目保存新增声音；BDSP 图鉴只为全图鉴五种动作提示，单种及形态操作保持静默。BDSP 杂项十种来源事件、贴纸和地下道全部／清空均已对应。

宝芬填满／清空仅限结果格式 SAV8BS 的 caseFill／caseClear；不作用于第四世代宝芬、第三世代方块、豆子或普通排列／字段保存。所有请求仍先经过 Core 校验、冻结预览与现有工作副本保护，声音表不充当领域校验。累计 99 处已绑定、7 处平台对应、58 处直接调用及通用消息路径未齐，PlaySoundOther 总入口继续禁用；不改原生算法、输入限制或实际存档字节布局。

2026-10-15 第九世代追加 38 处来源。朱紫本体／DLC 与 Z-A 图鉴各对应六种动作；训练家解锁操作以 Core 冻结票据的 operations 判断，Z-A 只将 resetAndCollectScrews 对应直接提示，普通收集与技术机器的通用消息仍另行核对。团体战传播和服饰 owned 以当前冻结预览的动作表判断，普通字段／种子／衣物记录导入不加成功音；同次服饰批量的内外重复调用在浏览器合并为一声。训练家 PNG／JPEG／BMP 图像导出沿共享下载分支和既有存活／代次检查提示。

甜甜圈的随机三级、克隆、异色组合、范围生成和文件／文本导入在成功提交后提示；来源动作与预览 token 绑定，取消和普通保存／重置不播放。团体战、服饰及甜甜圈的提交回调改为返回是否实际应用，失败保留预览与令牌并显示原三语过期提示，不再将返回 void 误当成功。来源标记只在 React 回调之间传递，不进入 Core 确认 JSON，API164 不变。

补齐甜甜圈复制十六进制入口，保留原二进制与文本文件导出。来源为 `SAV_Donut9a.B_ExportClick` 的 Ctrl 分支和 Core `DonutPocket9a.cs` 内 `Donut9a.Size=0x48`；只读 Core 导出后核对恰好 72 字节，按原字节顺序生成两位大写十六进制、单空格分隔、无尾空格，不重排端序或改数据。按钮及复制成功／失败消息使用三语与现有工具栏；复制不支持或被拒绝时不报成功，不修改工作副本。迟到导出／剪贴板响应不恢复旧提示。累计 137 处已绑定、7 处平台对应、20 处直接调用及通用消息路径仍待处理，PlaySoundOther 总入口继续禁用；真实页面、剪贴板和音频仍待 Chrome 核验。

## Unicode 与异色符号显示（2026-10-15，进行中）

- 来源为 WinForms `Main.Unicode`、`PKMEditor.UpdateUnicode`、`StatEditor.UpdateIVs`，以及 Core `GameInfo.GenderSymbolUnicode/GenderSymbolASCII`、`FormConverter.GetFormList`、`PowerPotential.GetPotentialString`。
- 实体读取新增可选潜力文字，由原 Core 按当前 Display.Unicode 返回星级或加号。形态选择沿同一符号表；性别限制的原始判断固定使用 Unicode 语义表，不因 M／F 文本切换改变可编辑范围。显示读取不修改实体或存档。
- 基础编辑器显示当前已读取宝可梦的 Core 潜力评价，应用个体值修改后随新报告更新；草稿未应用前仍为当前值，不在 JavaScript 重写评价算法。异色操作按钮按保存的 Display.Unicode 使用 Draw.ShinyUnicode／ShinyDefault；两项符号设置已开放，普通文本转义显示，允许来源空字符串及最多 32767 字符，显示宽度限制为 5em，完整设置不截短，三语操作名称和可访问名称保持。
- 图鉴、个人数据图表、森林、运动场、名人堂及训练家形态列表统一使用 Core 符号表，数量／编号／语义校验保持；形态文字偏好不改变性别可选范围。默认显示偏好沿来源 Unicode，而非各模块自行固定 ASCII。
- 原生双模式及跨模块回归、真实 E.sav 两模式共 50 条读取、前端类型、最新核心与顺序网页产物均通过。训练家性别等其他界面消费点及原版游戏字体映射尚未接齐，Display.Unicode 全局入口仍禁用，不作为完整 Unicode 功能或页面验收。

2026-10-15 补接前端性别显示：共用来源的三项符号表及设置订阅，基础训练家、剑盾／BDSP／阿尔宙斯／Let's Go／朱紫／ZA、宝可梦编辑与两处详情、第六世代名人堂、第四世代与剑盾图鉴入口沿同一规则。三语名称保留并附加来源符号，原始未知编号显示 `#编号`；不改数值、校验、选项顺序或存档字节。字段式训练家仅对明确 gender 字段处理，语言等其他选项保持，剑盾确认预览共用显示。无新增字体、字号或控件皮肤，普通浏览器字体继续使用。字体平台对应及其余消费点仍需核对，Display.Unicode 暂不开放。

字体来源复核发现 `PKHeX.WinForms/Resources/byte/PGLDings-NormalRegular.ttf`，21004 字节，SHA-256 为 `22ABF315BAF5101516903390513AD2EBE1DF727F6B87285A8B91F9BB019CE26E`；`FontUtil.GetFontFileName` 将各上下文指向该资源。读取 name 表只得到家族名，未找到版权／许可文本或链接，OS/2.fsType 为 4。按 [OpenType fsType 规范](https://learn.microsoft.com/en-us/typography/opentype/spec/os2#fstype) 该值为 Preview & Print，而非 Editable embedding；这些元数据不足以确认可随 Web 编辑器分发。当前未复制、转换或改写字体，继续浏览器字体及既有原始码位编辑；字体许可／平台对应保持未解决，不作为完整字体兼容结论。

## 无效选项颜色（2026-10-15）

- 来源为 `PKMEditor.ValidateComboBox` 与 `DrawConfig.InvalidSelection`：无有效选中值时使用配置底色及黑色文字，恢复有效选项后恢复普通控件。颜色沿已有设置协议 `#RRGGBB` 六位十六进制，默认 `#e9967a`；不改变任何实体数值限制、基数或字节。
- 新增存档功能内的 `PokemonSelect` 包装，复用共享 Select 的尺寸、焦点、键盘及菜单。未知原始值显示 `#编号` 并声明 `aria-invalid`，不伪装成首项；原有未列出占位与不适用选项明确禁选，当前值仍可见，不自动写回其他值。有效零值、分组选项及正常样式保持。损坏颜色策略沿安全默认提示，Core 继续独立拒绝无效完整设置。
- 基础属性／招式、回忆招式、来源、记忆、历史、形态参数、缎带、异色和超级训练实体编辑入口共用该规则，存档与独立宝可梦同步生效。查询工作台不套用实体错误状态；开放 `Draw.InvalidSelection` 设置。原有域及 Core 校验继续决定能否提交，颜色不作为合法性判定。
- 缎带当前编号按 `affixedChoices` 的实际 ID 查找，不能用列表长度判断稀疏编号；无佩戴的 -1 仍为有效选项。不修改来源缎带编号或条目顺序。
- 前端与工程证据见进度。浏览器实际焦点、菜单、颜色与修正后恢复仍待外部 Chrome 核验，不把静态渲染检查当作页面验收。

## 宝可梦形状标记（2026-10-15）

- 来源为 `PKMEditor.SetMarkings/ClickMarking/ToggleInterface`、Core `IAppliedMarkings`、`MarkingApplicator.ToggleMarking`、`G3PKM` 与各格式 `GetMarking/SetMarking`。第三世代显示圆形／正方形／三角形／心形四项，Core 的 G3PKM 已规范化三角形／正方形位，因此界面顺序额外映射为 0／2／1／3；后续格式显示圆形／三角形／正方形／心形／星形／菱形六项。不从原始打包字节另写格式算法。
- 实体读取新增可选标记资料，存档与独立宝可梦共用三语编辑入口。普通标记为 0／1，彩色标记为 0／1／2，依来源顺序切换；原始保留值 3 可保留未编辑状态，不能通过请求新建，点击时沿来源转为蓝色。按钮声明形状与状态，不只依靠颜色，目标至少 44px；应用和本地还原只在草稿有变化时启用。
- 请求沿原 `PokemonRawEdit` 新增 markings 操作，值数组必须等于 Core 的 MarkingCount（4 或 6）；全部元素校验后才调用来源 setter，保留打包字段的其他位。旧世代、空实体、坏校验和及锁定格位沿原保护拒绝；标记不触发队伍能力值重算，沿工作副本、撤销及导出重读流程。无自由输入进制、空白或文本宽度参数。
- `Draw.MarkBlue`／`MarkPink` 已绑定这两个入口。颜色使用设置协议的 `#RRGGBB`，前端再次校验六位十六进制；默认分别为 `#00bfff`／`#ff75b3`。普通与保留状态沿当前文字颜色，未标记图形沿来源显示为 1/8 不透明度。损坏设置禁用应用，Core 仍独立校验完整策略。
- 工程检查与真实存档证据见进度。浏览器交互及控件视觉尚待外部 Chrome 核验，其他 Draw 设置仍在完整目标内。

## 格位轮廓光晕（2026-10-15）

- 来源为 `SpriteUtil.GetSpriteGlow(PKM)`、`ImageUtil.GlowEdges`、`BitmapAnimator` 与 `DrawConfig`。实体悬停响应新增独立图像资料：基础形态、蛋和异色，不加入道具、暗黑洛奇亚替换图、巨大化／头目标记、合法性及储存状态；霸主形态沿基础绘图保留原效果。查询沿既有 1024 字符及真实位置限制，不改存档字节。
- 普通轮廓使用原污染像素算法，蛋沿原空心算法；复用同一本机图像加载和合成函数，不用 CSS 阴影代替。真实箱子／队伍与登记队伍在共享入口显示，资料库及相遇候选继续原有预览。`HoverSlotGlowEdges` 已绑定设置页、布尔校验和实际启停；关闭时保留普通格位反馈。即使文字和叫声关闭，光晕开启的真实格位仍可读取轮廓反馈。
- Windows 的 ActiveCaption／Highlight 在浏览器明确映射为当前 Ant Neutral 的 `--teal-soft`／`--brand`，不是读取电脑系统色。动画沿来源 16ms 间隔、16 阶单程及 512ms 往返；减少动态效果时固定为高亮色。遮罩置于原图后方，不接收输入，不改变控件尺寸；离开、切换、隐藏页面、滚动或改资料时沿共享悬停生命周期移除，迟到图像不得恢复旧反馈。
- 三组普通光晕黄金数据来自未修改的上游 `ImageUtil.cs`，覆盖边界、半透明与透明像素；原有空心夹具保留。工程检查见进度；外部 Chrome 的实际叠层、主题及交互仍待核验。

## 本机叫声资料与播放（2026-10-15）

- 来源为 `PKHeX.WinForms/Controls/Slots/CryPlayer.cs`、`SummaryPreviewer.cs`、Core `LocalResourceSettings.SoundPath` 与 drawing `SpriteName.GetResourceStringSprite`。Worker 返回形态 WAV 名与物种编号回退名，忽略性别并保留武道熊师 Form 1 的 `892-1.wav` 特例；前端不重写形态／世代命名规则。
- 设置页新增可折叠的三语本机资料入口，支持 WAV 文件／目录导入、当前分类列表、明确移除与单步撤销。选择的目录根映射到已保存 SoundPath，子目录保留独立分类；播放只查当前目录根层，不递归或扫描电脑。默认 sounds，空白沿本机根分类 local。形态名优先，缺少时回退物种编号，名称按 Windows 来源规则忽略大小写。
- 资料放在独立 IndexedDB，Blob 保留原字节。最多 4096 文件，单文件 16 MiB，总量 256 MiB；只接受来源可匹配的数字／连字符形式 WAV 名，导入核对 RIFF/WAVE 文件头。重名不覆盖，须先明确移除；完整快照按版本号比较后原子写入，存储失败保留旧资料。广播与 storage 通知其他本机标签，更新后停止旧播放。
- 播放需用户在本机资料入口启用，状态仅在当前页面保留。共享 Web Audio 通道只播放当前悬停来源，离开、切换、隐藏页面、改设置／资料或关闭声音都会停止；迟到读取和解码不得启动旧声音。即使两类文字预览均关闭，启用叫声后仍可按来源规则播放。
- 关闭开关、缺少文件或浏览器拒绝启用时不会自动发声。解码缓存最多 8 项／32 MiB；单段解码结果最多 120 秒／32 MiB。WAV 解码由浏览器完成，不兼容或超限时给出当前语言提示。目录和悬停叫声两个设置已开放，SoundSettings 的其他提示音仍未绑定。
- 本批不包含系统颜色相关的边缘光晕；来源 `DrawConfig` 使用 Windows 系统色，不能以普通 CSS 阴影冒充原像素效果。工程检查见项目进度；真实 WAV 在外部 Chrome 中的解码、播放与听感仍待核验。

## 跨来源悬停预览（2026-10-15）

- 资料库当前存档／实体文件／其他存档条目、Stadium 登记队伍、相遇与配信候选共用原有预览组件。弹层字体、定位、键鼠与触屏规则保持统一；嵌套编辑器按最近的预览作用域处理，避免同一格位被重复请求。
- 新增只读 `ReadContextHover`，用 `kind` 区分 slot、database、registered、encounter、gift。真实格位使用 box／slot，资料与候选使用 id，登记队伍使用 group／slot；非真实格位响应的旧 box／slot 字段为 null，不伪装为箱子位置。查询最多 1024 字符，数字为有符号 32 位整数，各命名空间核对必填项、非负索引、互斥字段与真实集合边界。
- 资料库沿 `SAV_Database.ShowHoverTextForSlot`，以条目自带的 `Source.Type` 做合法性分析；登记队伍沿实际 `SlotGroup.Type` 和原存档个人表。全部实体先复制，保留原来源、文件与存档字节。
- 候选沿 `SummaryPreviewer.Show(IEncounterInfo)`，只读 `GetTextLines` 三语文字，不生成实体或调用转换。`HoverSlotShowEncounterVerbose` 已开放，仅用于候选；配信类型依来源不追加 record 属性。预览只读取当前会话结果，不重置搜索和冻结确认，不消耗新的生成结果。
- 每次结果带原始 target 与完整存档 SHA-256；前端同时核对目标、当前列表对象与格位元素属性，拒绝切换搜索或来源后的迟到响应。独立悬停请求不进入前台编辑的操作编号或忙碌状态；更改设置、存档和资料集合仍按现有 Worker 生命周期失效。
- 本批工程检查与日志见项目进度。声音／本机叫声资料与边缘光晕仍未接入，不将文字／图像预览当作全部 Hover 完成；实际外部 Chrome 页面仍待核验。

## 格位悬停预览（2026-10-15）

- 箱子、队伍、箱子全览和双箱视图共用格位预览。来源为 `PKHeX.WinForms/Controls/Slots/SummaryPreviewer.cs`、`PokePreview.cs` 与 `Settings/HoverSettings.cs`；文字与合法性仍由原始 Core 在 Worker 内生成。
- 沿来源拆分战斗模板、招式及有效性、首条非法原因与相遇信息。三语模板通过 `BattleTemplate.Hover.GetSettings` 和 `ShowdownParsing.GetLocalizedPreviewText` 输出，保留觉醒力量类型／威力及其他能力值附加规则；名称、属性图标、精灵球和宝可梦图像使用当前本机资源。区段开关同时作用于 Core 返回内容，预览／文字模式由共享前端选择。
- 开放 `HoverSlotShowPreview`、`HoverSlotShowText`、`HoverSlotShowEncounter`、`HoverSlotShowLegalityHint`、`PreviewShowPaste` 与 `PreviewCursorShift.X/Y`。Alt 临时切换为文字提示；两种显示都关闭时不请求。属性图标与非法提示保留语义色，辅助预览不修改选择、焦点或存档。
- 浏览器共用文字提示的 200 毫秒防抖；移出、换格、修改存档、切换设置、拖动和卸载均使旧结果失效，不取消前台编辑。键盘焦点可读，Escape 先关闭预览；触屏点击保留详情编辑。预览跟随指针并限制在视口内，内容本身可悬停和滚动。
- 位置查询 JSON 最多 1024 字符，box／slot 必填整数，由 `PokemonEditing.Read` 核对实际箱子／队伍边界。偏移沿来源 Point 的有符号 32 位整数，默认 (16,8)，只在布局阶段限制到视口，不改写保存值。读取绑定完整存档 SHA-256，使用原存档个人表及真实 Party／Box 上下文，保留全部输入字节。
- 首次接线覆盖真实存档的箱子与队伍格位；数据库、登记队伍与相遇候选的后续接线见上节。`HoverSlotShowEncounterVerbose` 沿来源仅影响候选，不影响 PKM 预览；声音／本机叫声资料及边缘光晕仍在完整目标内，未绑定选项继续只读。工程结果见项目进度，实际 Chrome 页面仍待核验。

## 自定义配信共享数据（2026-10-15）

- 存档与独立宝可梦客户端在派发前读取 IndexedDB 配信资料，并按当前 `LocalResources.MGDatabasePath` 选择分类及子分类。读取失败停止操作，保留工作副本，不静默退回内置资料。
- 每个 Worker 调用原始 Core `EncounterEvent.RefreshMGDB`，从仅属于该 Worker 的临时内存文件系统加载资料并清理临时文件。文件名使用内部编号，不访问导入名称中的电脑路径；完整配信先由 Core 解析为标准卡片。
- 合法性分析、相遇检索和默认配信数据库共用外部配信表。显式传入配信文件的窗口只组合内置表及本次文件，避免再次拼接全局外部表。重复文件仍遵循来源行为；Core 当前按对象身份保留内容相同的多个文件。
- 数据集绑定 Worker 指纹，重复配置保留相遇对象身份，变化后必须重建 Worker。资料写入成功后通知本页和其他标签，取消处理中请求，清除旧合法性报告并刷新相关工作区；配信窗口重新建立会话，同时保留本次撤销快照。取消或超时后的资料读取结果不得再次派发。
- 上限为 1024 文件、单文件 Base64 64 KiB、解码总量 16 MiB、JSON 24 MiB；文件名 4096 字符。PGT／WR7 沿来源规则可用于手动配信窗口，但不进入 `RefreshMGDB` 支持的十种全局外部表。
- 来源：`PKHeX.Core/Legality/Encounters/Data/EncounterEvent.cs`、`MysteryGifts/MysteryGift.cs`、`MysteryGifts/MysteryUtil.cs`，及第六世代 `EncounterPossible6`／`EncounterEnumerator6`。实际 Chrome 页面、浏览器内存文件系统及跨标签交互仍待连接恢复后核验，不能以原生或前端检查代替页面验收。

## 全局设置（SettingsEditor，来源核对）

2026-10-15 配信资料库接 LocalResources.MGDatabasePath，来源为 LocalResourceSettings.GetMGDatabasePath、SAV_MysteryGiftDB.DatabasePath 及 MysteryUtil.GetGiftsFromFolder。默认 mgdb，空白对应本机根分类 local，按目录边界包含子分类。自定义文件新增可选 directory 元数据；缺失时只读归属 mgdb，已有文件不迁移或改写。存储升至版本 2，保留已有对象仓库和快照，旧页面不能按版本 1 继续写入；完整快照 CAS 包含目录、名称、内容、时间与顺序。

读取与筛选只向配信资料库会话传当前目录文件，内置配信保持；移除只接受当前分类的文件 ID，撤销保留完整快照及其他目录。目录与相对文件名组合进入 Core，保持原扩展名与字节。目录字段沿设置 32767 字符；Core 完整来源名仍限 4096 字符、最多 1024 文件、单文件 48 KiB／Base64 64 KiB、全库 16 MiB 和请求 JSON 24 MiB。先进行原生验证，再更新本机库；存储失败重开旧快照。导入／移除／撤销及目录说明沿三语与共享控件。

新增目录选择导入，保留 webkitRelativePath。候选文件使用现有 48 KiB 产品上限，超出候选范围不读入；候选范围内由新增只读 Core 批量识别入口使用 MysteryGift.IsMysteryGift／GetMysteryGift 判定，忽略非配信文件，不在 JavaScript 重写格式识别。识别不会重置当前配信会话或修改内置数据；全部无效时显示当前语言结果说明。批量识别进入 Worker，输入仍有 1024 文件／16 MiB／24 MiB JSON 保护。

前端五文件 17 项及定向 Lint 通过。修订测试中多余的 Span 访问后，原生识别及既有配信数据库回归通过；类型、新核心及顺序构建后的前端产物均通过。日志为 `.tmp/pkhex-gift-directory-{front,lint,native-final,types,core,build-final,format-final}.log`。本轮目录消费点为配信资料库；StartupUtil.InitializeStatics 的全局外部配信刷新对合法性与相遇的影响仍需单独接线，不将窗口已读自定义文件当作全局刷新完成。页面和真实 IndexedDB 升级未核验，本批未提交，完整目标继续。

2026-10-15 接入 LocalResources.DatabasePath 的本机资料目录。来源 LocalResourceSettings.GetDatabasePath 默认 pkmdb，空白解析到本机根分类 local；SAV_Database.LoadEntitiesFromFolder 对资料目录递归读取实体文件。浏览器采用目录分类，包含子分类，区分 pkmdb 与 pkmdb2 等相邻名称，不执行磁盘扫描。手动选取的其他存档和只读存档库来源保持独立，不因实体资料目录变化而删除。

实体文件新增可选 directory 元数据；缺失时只读解释为 pkmdb，不迁移或重写旧资料。IndexedDB 升至版本 2，已有对象仓库保留，旧版本页面不能继续按版本 1 写入。替换／撤销 CAS 同时核对目录、原名称、格式标记、时间与完整字节，失败保留旧集合。全库仍受 1024 文件／总计 128 MiB 上限，单文件 64 MiB；目录字段沿设置 32767 字符，组合后的 Core 来源名称仍受 4096 字符与二进制描述 JSON 1 MiB 上限，不静默截短。

打开／重读／预览／确认／报表只向 Core 发送当前资料目录及子目录、手动其他存档与只读库快照。来源名称包含目录，使同字节的目录替换也进入原生绑定。加入资料库使用当前目录前缀，提交只接受当前目录的新增结果、拒绝移除非活动目录或库快照；持久化／撤销保留完整集合及其他目录。目录提示三语，设置入口开放 DatabasePath；破损目录设置拒绝操作，不回退到另一分类。

前端五文件 32 项与定向 Lint 通过，覆盖旧记录默认归属、版本升级不重建仓库、目录／子目录边界、原生名称、跨目录拒绝、CAS 及原缓冲保护。完整原生数据库回归通过。本轮没有修改 C#／Wasm 产品代码，不重复核心构建；类型、前端构建与真实副本目录提交核验通过；真实 E.sav 的 PK3 以完整目录名读取、同字节错误目录替换被拒绝、加入／冻结确认保持目标名称和实体字节，原件哈希保持。日志为 `.tmp/pkhex-database-directory-{front,lint,native,types,build,format-final}.log` 和 `.tmp/pkhex-database-directory-check/run.log`。浏览器 IndexedDB 升级和页面操作仍需外部 Chrome 核验，本批未提交；其余本机资源设置及完整目标继续。

2026-10-15 补齐目录设置在启动发现和存档库中的消费点。来源为 Core StartupUtil.InitializeStatics、SaveFinder.Get3DSBackupPaths／GetSwitchBackupPaths，以及 WinForms SAV_FolderList.GetPathList／构造器。额外目录按分类与子目录边界匹配；最近列表保留原有手动记录，并补充额外目录及已导入的常见主机目录，沿来源排除 .bak／backup 文件，明确记忆的最近文件保留备份名例外。备份列表保留手动标记，并识别配置备份分类内的文件。以上均为显示分类，不改持久化标记、原始字节或 CAS 哈希。

启动 RecentBackup 发现范围为明确导入的最近／记忆文件、配置额外目录和已导入的常见主机目录，仍排除备份文件名并按修改时间排序；LastLoaded 保持最近打开顺序及数量标记。常见目录元数据为九项 Core 枚举路径，前端 JSON 由原生测试逐项对照。只识别已导入的分类，不枚举磁盘、挂载设备或自动取得文件权限。

存档库新增三语配置目录快捷筛选及目录范围选择，使用共享 Select 与 44px 按钮。配置项只有在库内有对应文件时启用；浏览器以筛选分类替代 Windows Explorer 打开目录。范围筛选按目录边界包含子目录，和现有列筛选／排序／分页组合；范围模式可查看已导入但不在最近／备份列表内的文件。查询新增可选 FolderRoot，默认 null；域限制 32767 字符，表单只选现有分类。返回最近／备份页会清除范围。打开库内文件保留原来源 ID，不再另造一份最近缓存。配置备份根的整理只新增直属文件，子目录不因新分类而进入整理；旧手动备份标记沿既有规则保留。

原生目录设置专项及原有列表／冻结会话／公开 API 回归通过，覆盖九项 Core 路径、13 存档格式、目录边界、原元数据和哈希保护；前端五文件 38 项和定向 Lint 通过。类型、最新核心与顺序重建后的前端产物均通过；首次前端构建主动停止，最终产物在新核心完成后生成。真实 E.sav 工作副本通过配置最近／备份分类、跨请求范围保留、目录子项筛选、打开重读及校验和／25 只宝可梦检查；打开所得副本与原件 SHA-256 完全相同。日志为 `.tmp/pkhex-library-locations-{native,front,lint,types,core,build-final,format-final}.log` 及 `.tmp/pkhex-library-locations-check/run.log`。页面尚未核验，本批未提交；其余 LocalResources 路径及剩余设置仍在完整目标内。

2026-10-15 宝可梦数据库接本机存档库来源，开放 EntityDb.SearchBackups／SearchExtraSaves／SearchExtraSavesDeep 与 Backup.OtherBackupPaths。来源为 `PKHeX.WinForms/Subforms/SAV_Database.cs` 的 LoadDatabase／LoadEntitiesFromFolder、Core `EntityDatabaseSettings.cs`、`BackupSettings.cs` 和 SaveUtil.GetSavesFromFolder／IsBackupFilePath。三个开关默认 true；先读取额外目录并排除 .bak 与基础名 backup，再读取 BackupPath 分类并保留备份文件。“搜索子目录”同时作用于两类目录；保留重叠／重复目录产生重复结果的来源行为，每个扫描结果有独立会话 ID。

路径对应已明确导入的浏览器存档库分类，统一分隔符及末尾分隔符，按分类名与子目录边界匹配，不访问或扫描电脑目录。额外空白路径跳过，备份空白路径沿既有约定对应 local。布尔字段在表单和解析层保持一致；目录列表沿现有完整设置协议的 8192 项、单项 32767 字符和完整 JSON 2 MiB 上限，无独立 Qt 数值或进制输入。组合来源仍受数据库 1024 文件、单文件 64 MiB、总量 128 MiB、ID 128 字符和显示名称 4096 字符限制；本机存档库单文件上限仍为 32 MiB。

数据库打开、预览、确认、独立编辑加入／导入及报表使用同一份包含存档库来源的二进制快照；点击“读取数据库”重新选取当前分类内容。库来源只按其他存档交给既有 Core 读取，不进入宝可梦文件库的替换／撤销事务；前端拒绝删除或替换来源快照 ID，Core 继续拒绝对其他存档格位直接删除。设置变化会重新初始化资料视图，并用读取代次及存活检查拒绝旧来源读取。来源清单采用三语说明，文件来源折叠控件统一 44px、15px 字号、10px 圆角、悬停与键盘焦点。

前端五文件 29 项与定向 Lint、完整原生数据库专项通过，包括既有 13 存档格式、18 实体布局、BR 区域／分区／四配置、COLO／XD／RSBOX 合成记忆卡及只读源保护。真实 E.sav 工作副本通过 25 个当前条目＋25 个备份条目、来源 ID、备份删除拒绝、导入一只至工作副本／确认／重读及校验和检查，来源文件 delta 为空，原件哈希保持。日志为 `.tmp/pkhex-database-library-{front,lint,lint-final,native,types-final,build-final,format-final}.log`、`.tmp/pkhex-database-library-check/run.log`。最终类型复查、定向 Lint 和前端产物构建通过；已补清空旧预览／加载状态、合并容量预检及旧目录结果保护；本轮没有修改 C#／Wasm 产品代码，不重复核心构建。Chrome 本轮识别为 id3，但标签为空且 fetch 失败，页面未核验；本批未提交，完整目标保持。

2026-10-15 接入打开时自动备份、启动恢复和最近记录上限。`Backup.BAKEnabled` 默认 true；备份名称直接由 Core `SaveFileMetadata.SetExtraInfo/GetBackupFileName` 生成，保持摘要、文件名清理和既有后缀去重。沿 Main.TryBackupExportCheck，在成功读取时备份输入原始字节，同分类同名备份存在时不覆盖；编辑和导出不会覆盖这份备份或磁盘原件。本机最近条目与新备份在同一 IndexedDB CAS 事务提交，容量／并发失败保留旧目录，打开的文件仍可编辑并显示三语失败提示。目录仍受 1024 文件、单文件 32 MiB、总量 128 MiB 限制，不自动删除旧文件腾空间。

`LocalResources.BackupPath` 对应浏览器存档库的分类名称，默认 bak；空白对应 local。仅访问已明确导入的本机内容，不按字符串扫描电脑目录，不申请额外文件系统权限。设置页面明确说明存储范围及清除网站数据会删除副本。`Startup.RecentlyLoadedMaxCount` 沿来源 uint setter 范围 1–1000、默认 10；下一次成功打开时按打开顺序修剪 recent 标记，同名同分类旧版本退出最近列表，所有旧字节及备份继续保留。

`Startup.AutoLoadSaveOnStartup` 沿 Disabled=0／RecentBackup=1／LastLoaded=2、默认 1。RecentBackup 沿 SaveFinder.DetectSaveFiles 及 SaveUtil.IsBackupFilePath，忽略 .bak 与基础文件名 backup，并按文件写入时间降序；保留来源大小写判断。LastLoaded 按最近打开顺序尝试已记忆条目。范围限于本机存档库，跳过无法自动识别的文件，不猜手动识别参数；未导出的编辑不会恢复。异步恢复检查工作副本、操作序号、组件存活及设置变化，用户打开／取消／关闭后停止。来源 `TryDetectRecentSave` 是文件选择器默认项，与启动恢复不同，仍未开放。

原生备份命名、后缀去重及原件保护、前端首轮三文件 108 项和最后两文件 11 项、定向 Lint、最新核心构建通过。真实 E.sav 工作副本备份名称与 Core 一致，默认设置 JSON 字段、备份重新识别和校验和通过，原件／输入副本／备份输出 SHA-256 完全相同。修正状态栏遗漏新提示、恢复错误被通用错误覆盖及 ES2023 toSorted 超出 ES2022 目标的问题，排序改在筛选后的新数组进行，保留原列表。最终类型复查、全仓格式及 diff 检查通过，页面未核验；当前浏览器清单无外部 Chrome。日志为 `.tmp/pkhex-save-library-{native,front,front-repaired,lint-final,lint-repaired,core,types-repaired,format}.log` 与 `.tmp/pkhex-real-save-check/backup-run.log`。当前未提交，剩余设置与完整目标继续。

2026-10-15 合法性报告接入 Display 四项：IgnoreLegalPopup、ExportLegalityVerboseProperties、ExportLegalityAlwaysVerbose、ExportLegalityNeverClipboard。来源为 Main.DisplayLegalityReport：详细展开为 Control-only XOR AlwaysVerbose，复制始终使用完整 verboseReport、两个换行及原始相遇 GetTextLines；只有相遇描述部分受 VerboseProperties 控制，NeverClipboard 隐藏复制操作。当前语言分别由 Core zh-Hans／en／ja 生成，保持完整来源文本和换行。网页既有报告为内联区，IgnoreLegalPopup 适配为隐藏通过报告的正文／展开／复制，保留已完成状态，承接来源主窗口先更新合法性图标再忽略弹窗的行为。

存档、独立实体及登记队伍复用同一报告视图。存档分析改为实体副本，复制结果绑定具体报告，切换格位或载入新报告不会显示旧复制提示。复制按钮沿共享工具栏控件，三语操作／成功／失败信息已接；剪贴板只在点击时写入，没有自动复制。原生合法／不合法两结果 × 16 设置组合及三语完整剪贴板／原件保护通过；前端四文件 131 项、最后三语视图五项、最终类型／Lint、最新核心及 property-trim 均通过。原有合法性模块通过临时运行器调用已编译的原测试，完整报告／三语、11 存档格式队伍／箱子上下文及无效位置拒绝通过；真实 E.sav 工作副本编辑导出重读与独立 Core 全字节对照继续通过，原件哈希保持。日志为 `.tmp/pkhex-legality-display-{native,front,ui-final,lint,types,core,trim,context-regression}.log` 及 `.tmp/pkhex-real-save-check/legality-display-run.log`。Chrome 仍 id4／标签为空／fetch 失败，实际复制与页面未核验，本批未提交。

Backup／LocalResources／Startup 其余字段继续核对：桌面目录扫描、程序目录和路径解析需映射用户明确选定文件与浏览器本机存储，不能将路径字符串保存当作扫描生效。其余资源路径、额外扫描目录、文件选择器默认项及启动设置仍待绑定；不新增后端，不修改原件，完整目标保持。

2026-10-15 补齐真实格位的对战队伍、锁定、同行编号和初始伙伴标记，来源为 `SpriteUtil.GetSprite(PKM,SaveFile,...)`、`StorageSlotSource` 及各 SAV.GetBoxSlotFlags。沿来源顺序绘制 team、locked、party1–6、starter；x 分别为 49／54／52／0，y=0，使用原始图像尺寸。保留来源 slot 小于 30 的判断与首个队伍／同行位优先规则。存档空格位也可有保护标记，单独返回空格位图像描述，使用来源 b_0 底图，不删除、重编号或构造宝可梦数据。

图层顺序补齐来源分支：启用合法性标记时先加相遇背景／经验条，再加格位标记；关闭时经验条在标记之后，筛选灰度／透明度始终最后处理。共享 SVG 保留全部标记，Canvas 处理源像素与顺序。新增九个原始 PNG，累计导入 6421 项并记录 SHA-256／宽高。原生六种同行／队伍组合、SWSH 实际锁定队伍与空／非空状态、LGPE 物理格位和初始伙伴、原件保护及经验顺序通过；前端图像四文件 46 项和新增空格位全览七项通过，实体和 90 个物理格位保持。最终类型／Lint、最新核心及 property-trim 均通过，框架已更新；真实 E.sav 副本编辑／导出／重读及独立 Core 全字节对照通过，原件哈希保持。日志为 `.tmp/pkhex-storage-markers-{native,front,gallery,lint,types,core,trim}.log` 与 `.tmp/pkhex-real-save-check/storage-markers-run.log`。Chrome 本轮仍 id4／标签为空／fetch 失败，实际页面未核验；本批未提交，剩余全局设置与完整目标继续。

2026-10-15 存档格位接入合法性警告／禁用招式提示与 PKM 相遇背景，开放 display.FlagIllegal、sprite.ShowEncounterColorPKM 及筛选灰度／透明度四项设置。来源为 `SAVEditor.FlagIllegal`、`BoxEditor.GetFlags` 与 `SpriteUtil.GetSprite(PKM,SaveFile,...)`：默认检查，高级模式抑制标记；匹配存档 PKM 类型时用该存档 Personal，否则用实体 PersonalInfo，保留队伍／箱子 StorageSlotType。分析只操作实体副本，校验和 Valid 与 LegalityParsed／LegalityValid 独立返回。警告为 warn、合法但含禁用招式为 hint，均为 16×16、x=0/y=40；Tera 之后绘制，再应用原始相遇背景及经验条。蛋的零经验进度沿 EncounterMatch.LevelMin 判色。

箱子检索不匹配的图片按来源先灰度再改透明度，格位仍可导航。移除旧 CSS 固定 0.35 透明度，使用 Worker 生成的 256 项 alpha 映射及设置中的 float 灰度；前端明确保留 float32 中间运算和字节截断。`ImageUtil.ChangeOpacity` 与 ToGrayscale 对 <=0.01f 或 >1f 跳过处理，不把越界设置推断成全透明；灰度只处理非零 alpha 像素。临时 Windows 原生项目运行未修改的 ImageUtil 位图方法，七组完整字节 SHA-256 与前端匹配，覆盖正常、小边界、负值、超界及 float.MaxValue。System.Drawing 仅用于临时参考验证，产品不增加该依赖。

原始图像累计 6412 项，新增 warn／hint 保留 PNG 哈希和尺寸。原生设置／公开报告／格位及原件保护专项、最终前端三文件 38 项、末次类型与定向 Lint、修订核心及 property-trim 均通过，浏览器框架已更新。真实 E.sav 副本在新增合法性图片状态下继续通过训练家／单只宝可梦编辑、导出、重读及独立 Core 全字节对照，原件哈希保持。初稿启动字段名和透明度 skip 区间已按源码修正，不改变控件输入范围。日志为 `.tmp/pkhex-slot-art-{native-final2,filter-reference-final,front-final2,types-final,lint-final,core-final,trim}.log` 和 `.tmp/pkhex-real-save-check/slot-art-run.log`；夹具为 `sprite-filter-fixtures.json`。Chrome 本轮仍 id4／标签为空／fetch 失败，实际灰度、警告及布局未核验。本批未提交；其他全局设置、格位队伍／锁定／伙伴标记等继续，完整目标保持。

2026-10-14 相遇、配信数据库与宝可梦报告接入轻量共享图片视图，不再为行图片固定 b 模式或丢失物种编号。视图保留蛋／道具／异色／特殊标记与捕获球，沿当前存档初始化模式和第三世代版本；报告从原始存档初始化图片，避免 Clone 重置 FRLG 的版本或 PersonalTable。报告内容、列顺序、排序及 CSV 仍沿原规则，图片字段不加入数据列。

来源为 `SpriteUtil.Sprite(IEncounterTemplate)`、`GetMysteryGiftPreviewPoke` 与 `EntitySummaryImage`。普通相遇依次加捕获球、超极巨化、头目及背景；配信不加相遇背景，只按来源加蛋、持有道具、普通异色星、固定球和超极巨化标记。玛纳霏蛋沿专门分支忽略道具、球、异色与特殊标记。球图片位于左下角，缺失资源回退 _ball4。普通相遇背景使用来源托管类型名称 GetHashCode 乘 0x43FD43FD 的 RGB，保留同一 Worker 内的颜色规则；不另写 JavaScript 类型哈希。开放捕获球开关、相遇背景模式、厚度、两项透明度共五个设置，PKM 合法性相遇背景仍待接。

新增来源球图片后，累计导入 6410 个原始资源，保留 PNG 哈希／尺寸。原生共享视图、公开报告／相遇／配信 JSON 与三模式专项通过，覆盖真实物种、底图、分层、Manaphy、原件保护和 FRLG 原始个人表；前端六文件 35 项、类型及定向 Lint 通过。首轮编译缺少夹具 Location 和 byte 类型已修正；扩大夹具补有效 GBA 区块，第三世代配信明确关闭在场筛选以检查完整来源库，未改变产品筛选。设置／报告／相遇／配信四组原生回归、最新核心构建和 property-trim 均通过，浏览器框架已更新；真实 E.sav 工作副本的训练家／单只宝可梦编辑、导出、重读及独立 Core 全字节对照继续通过，原件哈希保持。日志为 `.tmp/pkhex-shared-art-*-regression.log`、`.tmp/pkhex-shared-art-{core,trim}.log` 与 `.tmp/pkhex-real-save-check/shared-art-run.log`。当前不提交。Chrome 仍 id4／标签为空／fetch 失败，真实页面未核验；下一步继续 PKM 合法性相遇背景和剩余设置，完整目标保持。

2026-10-14 补齐超极巨化、头目与暗黑／霸主图片效果，来源为 `SpriteUtil.GetSprite(PKM)`、`GetSpriteGlow`、`SpriteBuilder.GetBaseImageTotem` 及 Core `FormInfo`。超极巨化 dyna 图标 20×20、横向居中 x=24；头目 alpha_alt 为 20×20、x=49，按来源画布裁掉右缘。图标位于蛋／道具／异色层之后，暗黑分支优先于超极巨化与头目标记。霸主使用来源基础形态和前景橙色光晕，保留存储中的形态；暗黑洛奇亚使用 b_249x，但背景紫色光晕来自普通形态的无携带道具图像，蛋与异色按来源单独构建，不能拿暗黑底图或实际携带道具图像生成光晕。

光晕沿 `ImageUtil` 的 128 alpha 阈值、3px 邻域、0.0777 递增及挖空规则处理 RGBA，正确适配来源 BGRA 的蓝色借用通道。临时原生项目复制未修改的来源 `ImageUtil.cs`，只执行字节算法，生成六组原生 SHA-256 夹具；源码哈希为 `554131f495924be8eb23360da98c917552fe83bee3bf6713272061b8beccb3c7`。前端六组完整字节哈希与原生相同，覆盖半透明、孤立像素、画布角落和两种颜色，输入保持不变。System.Drawing 仅存在临时原生参考项目，产品没有新增该依赖或后端；产品仍采用本机 PNG 与 Canvas／SVG。

新增两项原始 PNG 后，导入来源资源累计 6373 项并保留哈希／尺寸。共享渲染器按资源地址关联图层，移除容易错位的图层数组下标；取消或重新载入时撤回旧画布，离屏 Canvas 不可用则保持 SVG。原生设置专项、最终前端三文件 26 项、定向 Lint、类型、最新核心构建与 property-trim 均通过，浏览器框架已更新。真实 E.sav 工作副本在新增图片报告下继续通过训练家／单只宝可梦编辑、导出、重读和独立 Core 完整字节对照，原件保护成立。日志为 `.tmp/pkhex-special-sprites-{native,reference,front,lint,types,core,trim}.log` 与 `.tmp/pkhex-real-save-check/special-sprites-run.log`，夹具为 `sprite-glow-fixtures.json`。Chrome 本轮仍 id4／标签为空／fetch 失败，实际 Canvas 和页面未核验；合法性相遇背景、数据库／报告图像与其他设置继续，当前不提交。

2026-10-14 接入存档图片的太晶背景与经验条，开放对应五项设置。来源为 `SpriteUtil.GetSprite(PKM,SaveFile,...)`／`ApplyTeraColor`／`ApplyColor`／`ApplyExperience`、`TypeColor.GetTeraSpriteColor` 与 `ImageUtil.SetAllTransparencyTo`／`BlendAllTransparencyTo`。太晶采用 Core 的有效属性及 IsOverrideValid，Stellar 为 LightYellow；四种背景枚举为 0–3，透明度为 byte 0–255，条带厚度设置保持完整 Int32 范围，显示时负值或超过 56 的值按来源截为整张高度。存档格位报告携带效果，独立宝可梦文件与非格位预览沿来源不添加格位背景。

图片仍使用本机原始 PNG。共享组件在 68×56 Canvas 中按既有图层组合，背景只替换 alpha 小于 128 的像素；条带对 alpha 为 128–254 的像素使用来源 20% 原值／80% 背景的字节截断混合，保留完全不透明像素。经验条最后写入最底一行：100 级 Lime，升级进度 DodgerBlue，零进度按原始相遇地点与等级判断 Yellow／DarkOrange；本批接未启用合法性图片叠加的路径，合法性相遇背景另行接入。PNG 加载或 Canvas 不可用时保留原有 SVG，避免空白图像；该回退不代表背景效果已生效。

同时修正插画模式 TM 使用 aitem_tm、第三世代代欧奇希斯按当前存档版本显示形态、FRLG 不确定版本按 PersonalTable 区分，以及第四世代阿尔宙斯 Curse 属性索引重排。缺失形态沿来源在种类底图上叠加 0.5 透明度未知标记；未识别种类保留完整未知图。原生设置专项、最终前端三文件 17 项、最终定向 Lint、类型、最新核心构建与 property-trim 均通过，浏览器框架已更新。日志为 `.tmp/pkhex-sprite-color-{native,front-final,lint,types,core,trim}.log`。新报告结构下的真实 E.sav 副本检查继续通过训练家与单只宝可梦编辑／导出／重读、独立 Core 全字节对照及原件保护，日志为 `.tmp/pkhex-real-save-check/sprite-color-run.log`。Chrome 本轮识别 id4，但标签列表为空且 fetch 失败，未运行实际 Canvas／页面检查。当前不提交，合法性相遇背景、超极巨化／头目／暗黑／霸主效果及其他设置继续。

2026-10-14 图片补齐携带道具与异色标记。来源为 `SpriteBuilder.cs`、`SpriteBuilder5668s/a/c`、`HeldItemLumpUtil` 与 `ShinyExtensions.GetType`；普通道具按 a/b 图像模式选择资源，招式学习器／招式记录沿来源合并图标，星形／方形异色使用独立来源标记。导入脚本从 resx 复制原始 PNG，累计 6371 项来源资源，记录 SHA-256 与叠加图层的原始宽高，没有修改位图。统一组件在 68×56 坐标系按底图、蛋、道具、异色顺序组合；道具右下角采用来源最大 32px、偏移 2px 和整数除法，异色透明度 0.7。完整蛋底图保持 0.33，持有道具蛋偏移 18/1；SVG 外层保留页面的尺寸／样式类，组合图像只提供一个可访问名称。

箱子、详情、独立文件、数据库、登记队伍、生成预览及对战通行证／对战代理继续复用统一组件，对战录像与 DLC 队伍本批也已接入。修正旧页面只为 img 设置尺寸导致组合图片变大的问题。原生设置专项通过，招式记录夹具由无法容纳编号的 PK3 改为 PK8；前端最终三文件 13 项、定向 Lint、类型、最新核心构建与 property-trim 均通过，浏览器框架已更新。日志为 `.tmp/pkhex-sprite-overlays-front.log`、`.tmp/pkhex-sprite-overlays-types.log`、`.tmp/pkhex-sprite-overlays-core.log`、`.tmp/pkhex-sprite-overlays-trim.log`。相遇、太晶、经验条及特殊形态效果仍未完全接入；Chrome 连接仍通信失败，不能宣称页面或完整设置验收通过。本批未提交。

真实 E.sav 工作副本新增单只宝可梦原始 PID 编辑、导出及重新读取检查，输出与独立 SAV3E／PK3 修改的完整存档字节一致，其余 24 只宝可梦报告不变；训练家金钱修改检查也继续通过。检查导出仅写入 `.tmp/pkhex-real-save-check/`，原件 SHA-256 保持 `7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。日志为 `.tmp/pkhex-real-save-check/pokemon-run.log`。此项确认编辑导出行为，不代表更改 PID 后的合法性或页面操作验收。

2026-10-14 隐私设置补齐 HOME 控件与浏览器标题。HOME 读取通过 IHomeTrack.Tracker，报告与编辑协议均使用 16 位十六进制字符串，避免 JavaScript number 的 64 位精度丢失；支持 PK8／PB8／PA8／PK9／PA9。来源 `PKMEditor.Designer.cs` 的 TB_HomeTracker.MaxLength=16，`PKMEditor.Update_ID64` 调用 Core `Util.GetHexValue64` 过滤非 ASCII 十六进制字符，空值为 0，显示 X16。值域为 0–FFFFFFFFFFFFFFFF，字段缺失的旧格式不显示且拒绝编辑。仅改 HOME 时不重置队伍能力值，存档、独立文件、明文／加密与箱子／队伍共用既有副本写回和完整导出检查。

HideSecretDetails 隐藏 HOME／PID／加密常数控件与 PID 摘要，保留 SID。HideSAVDetails 映射到 document.title：隐藏时保留 PokeRNGKit、存档格式和当前语言游戏名，移除文件名及训练家姓名；关闭存档或卸载后恢复原标题，不覆盖其他组件后来设置的标题。游戏名由 Core 三语 gamelist 提供；网页以显式打开的文件名和训练家摘要替代桌面 BAKName。来源 Main.GetProgramTitle 同样在隐藏时保留格式和游戏版本。原始标识标题、字段与说明已三语化，两个隐私选项均开放。

HOME／标题原生专项通过五种格式、四类实体文件路径、ulong 极值、空值／字符过滤、无支持格式／错误操作拒绝、完整实体和 BD 存档输出精确对照，包含 Core 三语游戏名映射。既有独立原始值编辑回归已通过，普通 PID／EC／表单范围和健康数据保护保留。四文件 53 项前端、三文件 5 项表单／隐私、最终核心／类型／Lint、property-trim 与全仓格式均通过，框架已更新。HOME 专项已加入默认完整原生测试路径，原 E.sav 哈希保持。日志为 `.tmp/pkhex-home-tracker-title.log`、`.tmp/pkhex-home-tracker-raw-regression.log`、`.tmp/pkhex-home-tracker-core.log` 和 `.tmp/pkhex-home-tracker-trim.log`。Chrome 本轮仍 fetch 失败，实际标题与控件操作未验收；当前批未提交，其他设置、图像叠加仍须完成。

2026-10-14 ReportGrid 两个设置已接报告初始查询：ExtraProperties 作为额外列，HiddenProperties 传给核心并用返回的 Visible 初始化网页列状态；排序保留临时隐藏状态，恢复全部列与复制沿当前显示。原版 `ReportGrid.cs` 先隐藏默认列再添加额外列，CSV 的 Export_CSV 不过滤隐藏列，网页保留这些规则。报告字段沿既有 Web 查询保护限制为每组最多 256 项、每项最多 128 字符；这是产品请求上限，不是 WinForms PropertyGrid 的源码上限，完整设置校验与表单均同步拒绝超限值。

SlotExport.BoxExport 的 Scope／FolderCreation／FolderPrefix／EmptySlots／FileIndexPrefix／Notify 已作为导出控件默认值，默认全为 0，范围依来源枚举分别 0–1／0–1／0–2／0–1／0–3／0–1。来源文件为 `PKHeX.Core/Editing/Saves/Slots/Exporting/BoxExportSettings.cs` 与 WinForms `Subforms/BoxExporter.cs`。无当前箱子时仍只能选全部箱子；本次导出可显式覆盖默认值。Notify=Silent 省略成功文字通知，失败仍保留网页错误反馈；系统提示音行为待声音设置接入。DefaultBoxExportNamer 按来源 AvailableNamers 查找，未找到时回退第一个命名器，ZIP 实际使用所选命名器；静态版本当前只提供来源 Default，不支持 WinForms DLL 插件。

五文件 130 项前端、修订原生设置、最终核心／类型／Lint、property-trim 与全仓格式均通过，浏览器框架已更新。原生用登记命名器确认真实 ZIP 命名及完整存档字节保护；原 E.sav 哈希保持。日志为 `.tmp/pkhex-settings-report-export.log`、`.tmp/pkhex-settings-report-export-core.log` 和 `.tmp/pkhex-settings-report-export-trim.log`。当前未提交。AllowBoxDataDrop、其他图片叠加与全局设置仍待接，完整目标未完成；Chrome 本轮仍 fetch 失败，实际报告显示、排序与下载未验收。

2026-10-14 三个数据库选项已接统一设置：宝可梦数据库的 InitialSortMode／FilterUnavailableSpecies／ResultsGridRowCount，相遇数据库全部五项与神秘礼物数据库全部两项，共十个字段。来源为 `PKHeX.Core/Editing/Program/Settings/EntityDatabaseSettings.cs`、`EncounterDatabaseSettings.cs`、`MysteryGiftDatabaseSettings.cs`：行数均经来源 setter 限定 5–20、默认 9，排序枚举 None／SpeciesForm／SlotIdentity 为 0／1／2。原生检索／分页接口继续消费现有 options 协议，不另写算法。宝可梦数据库的三个目录扫描字段仍禁用待接，不声明六项全部完成。

各数据库原先重复的选项控件改为打开统一面板的对应分组，保留数据库导入设置、筛选和相遇训练家管理；键盘焦点转到顶部设置入口。旧 localStorage 选项只投影到初始草稿，完整 Core 校验及用户确认保存后，统一 JSON 与迁移标记单次写入。旧模块键与训练家列表保留不动。快照版本 2 阻止旧页面覆盖时丢掉标记；仍能读取原版本 1。无统一标记时继续沿旧设置读取，统一后从完整模型投影，保存失败不发布迁移。首轮不可用存储读取回归和旧布局断言已修订，八文件 153 项、最终类型／Lint、全仓格式与 diff 检查均通过。Chrome 本轮仍 fetch 失败，实际跨标签与页面操作未验收。当前批只改前端设置连接，不重复核心构建或 RNG 回归。

2026-10-14 正式入口已接到存档工作区顶部的“存档工具设置”，支持三语分组、核对变化、保存和重新读取。当前开放五个已应用的 Core 分组及编辑器隐私、图像模式、异色图像与蛋显示；其余字段仍在完整 22 分组目录中，明确标为待接入且禁止修改。恢复默认草稿保留禁用字段的原值，无变化时禁止保存；数值控件沿目录的 min／max／step，嵌套字段显示来源层级以区分同名选项。该入口不代表全部设置行为完成。

隐私沿来源 PKMEditor.ToggleSecrets 隐藏当前 PID／加密常数编辑和 PID 摘要，不隐藏 SID；HOME 标识编辑本身仍待补齐，不声明已覆盖该控件。存档标题隐私、其他 17 分组作用点与图片叠加仍待接。设置只在 Core 完整校验后写本机快照，保存失败不发变更通知。活动操作阻止同页切换；跨标签设置变更立即终止旧请求。存档与独立文件重新读取工作副本并清理旧预览，保留字节、原件和撤销记录，实际界面行为仍待 Chrome 验证。

修复独立文件客户端未传入保存设置的问题：复用请求规则但保持独立 Worker 与 1 MiB 上限；独立报告回传 a／b／c 模式，重建时可保持之前的模式，强制偏好无需先读存档。六文件 131 项前端、修订的原生设置、类型／Lint 与最新核心构建均通过，框架已更新。首轮新增夹具误用了不存在的序列化／读取 API，改用来源 WriteDecryptedDataStored／Inspect 后通过。原 E.sav 哈希保持。现有 PWA 已对未带哈希的 dotnet.js 使用 NetworkFirst，其他框架资源使用 CacheFirst，无需重复引入同一策略。Chrome 本轮仍标签读取失败，未进行实际页面验收。

2026-10-14 图像模式与蛋显示已接统一 `PokemonSprite`：箱子、宝可梦详情、独立文件编辑器、数据库、登记队伍及生成预览复用同一组件。按来源 `SpriteBuilder5668s/a/c` 选择 b/a/c 模式；蛋保留种类底图，完整蛋模式底图透明度为 0.33，无持有道具的小蛋模式使用来源 18/1 像素偏移，玛纳霏使用专属蛋资源。缺失形态先沿来源备用模式检索，再尝试非异色形态与种类底图。相遇、太晶、道具等其他叠加仍待补齐，不声明完整渲染对齐。

设置原生专项修订后通过；首次新增玛纳霏夹具错误使用 PK3，改为 PK4 后通过。图像／组件 7 项、定向 Lint、类型、最新核心构建与 property-trim 均通过，浏览器框架已更新。当前 API164 在真实 `C:\Users\Hakuhiro\Desktop\200\battery\E.sav` 的工作副本上确认 SAV3E、14×30 箱子、5 个队伍成员和共 25 个非空宝可梦；修改金钱后导出并重新读取通过校验，全部宝可梦报告保持一致，输入副本与原件未改。工程记录位于 `.tmp/pkhex-real-save-check/run.log`、`.tmp/pkhex-settings-egg-check.log`、`.tmp/pkhex-settings-sprites-build.log` 与 `.tmp/pkhex-settings-sprites-trim.log`。Chrome 本轮仍无法读取标签，不属于页面或所有者验收。全局设置其余作用点与正式入口未接完，当前批不提交。

当前API164核心32508已成功，框架资源已生成。目录9099、公开93380、颜色87743与真实读取报告异色15117通过；97项前端专项、组件类型78965和定向Lint均通过，格式39115通过。当前仍有完整设置作用点、模式与图片叠加及入口未接，Core构建成功不能当作设置模块完成或页面验收。裁剪专项正在运行，本批未提交。312条基础标签已扩大为含枚举值的413条，来源文件和哈希不变。

API164 目录末次9099与异色报告15117均通过；413条来源三语标签包含枚举选项，97项存储／客户端／标签专项及组件Lint、类型通过。Sprite.ShinySprites已作用于SpriteName，并修正PokemonReader传p.IsShiny，实际报告字段有专项；请求结束恢复先前值。source resx导入脚本import-pkhex-sprite-modes按原始b／a／c名称复制5230资源并记录每个来源SHA256，包含异色／头像／插画，不变换PNG。模式选择及蛋／相遇／太晶叠加仍未全部接，不能把图片入库当作完整渲染实现；其他设置作用点仍需接，组件未挂正式入口。新核心构建中，编译输入冻结，当前无完整构建终态或页面验收，本批未提交。

API164 新增 SaveProgramSettings 全部22对象与 source-generated 完整JSON编解码、元数据字段目录；Core类直接复用，WinForms特有 Startup／Display／Sprite／Hover／Draw／SlotExport 按已核对公开属性建浏览器模型。三数据库行数沿Core setter 5–20、最近数沿来源1–1000、语言旧码迁移与默认版本setter沿来源；StatDisplayConfig静态默认经独立深拷贝。每请求Scope配置、相同Worker设置指纹锁与 finally旧状态恢复已接，客户端设置变化终止Worker以废弃旧冻结票据。本机快照具有版本／revision并在冲突或配额失败时保留旧值，完整Core验证后才应保存。模型5141／目录49562／公开93380原生与存储／客户端96项通过，尚未完成核心构建／裁剪／整仓／真实页面；共享编辑组件暂未挂入口，剩余设置实际使用点仍待接，不能把保存配置当作全部功能生效。

设置标签资源 settings-labels.json 的312条 PropertyGrid／LocalizedDescription／SettingsEditor 文本由只读 PKHeX26.08.26 WinForms Resources/text 的 en／zh-Hans／ja 提取，本地打包，继续受GPL-3.0-or-later和既有PKHeX归属约束。来源SHA256：en `C323311799D0101CFD05DDEDDD46FB210BF22AE4AB8FADF96B67052681AD554C`；zh-Hans `AEBFC1DB32289C37D8E6CD1D337BDE0F84F4B596EC8BF824D4EE7F398CDF2C64`；ja `503665381D3C040B589A90839D9F99A5326B18BE6EA22861C3724B407160E330`。颜色名称转RGB专项87743当前运行，不能把未终态检查计为通过。

当前内部工程证据：实际格位八组合31248、严格JSON77565、原子与嵌套作用域55999均退出0，五对象深拷贝／完整嵌套验证／全局应用／旧状态恢复／完整输出对照通过。尚未接公开22对象目录、Worker、本机持久化、正式设置界面与其他设置对象作用点，API163不变。本节后续运行中记录是过程证据，不作为最新状态；当前模块未提交，完整PKHeX目标未完成。

严格 JSON 专项77565已通过完整嵌套配置、遗漏／未知／重复字段拒绝；原子与作用域检查继续通过。实际写入专项31248正在运行，八种全局写入设置分别通过默认 SetBoxSlotAtIndex 与来源显式 EntityImportSettings 对比完整 G3E 文件，保留原件断言。来源 SAVEditor.GetImportSettingsOverride 的 Yes／No／其他返回 All／None／default，全局设置只替代默认行为，显式操作选项继续优先；22对象完整公开目录、持久化及正式 UI 未接。

内部作用域专项 55999 已退出 0，覆盖空嵌套／非法 enum 在改全局状态前拒绝、旧合法性对象 identity、分组语言 fallback 和原始 EntityImportOption（含 UseDefault）恢复、嵌套与重复 dispose。严格 JSON Decode 新增 256 KiB 字符请求保护与每级完整可读写字段、未知／重复字段拒绝，专项77565正在运行。现有 PokemonEditing／PropertyBatch 存在显式 EntityImportSettings.None，后续按来源操作作用点区分显式选项与全局默认，不直接批量替换以强迫设置生效。公开目录、22对象实际使用、持久化和页面仍待接。

内部原子层已经写入：通过 source-generated JsonTypeInfo 遍历可读写属性，先验证全部嵌套非空与 Severity／LanguageID／GameVersion／两个转换 enum，再应用。快照保留 Core 旧合法性对象及全部已应用参数，失败恢复与嵌套请求 IDisposable 结束恢复同一状态；原 EntityImportOption 可为 UseDefault，不能转成 bool 后丢失。SaveLanguage.Apply 可能跳过 GS／RS 等分组版本，恢复显式重设四版本，避免请求残留。原子专项初稿41197的无效 enum 测试常量超出 sbyte 范围已改127，修正55999尚无终态；这些内部代码不构成公开22对象接入或页面验收。

SettingsEditor 已开始内部开发，SaveCoreSettings 包含五个纯 Core 设置对象（Legality／Converter／Import／SlotWrite／SaveLanguage），使用 source-generated JSON 深拷贝再逐项应用来源全局行为，避免用户后来修改嵌套对象影响运行中的 Core。初稿专项 97280 正在编译运行，尚无结果；API163 保持。该内部层尚未开放输入，完整嵌套输入验证／原子应用／旧全局状态恢复、公开 Worker 协议、本机持久化、22对象目录和真实 UI 仍待接入；不是全局设置功能完成。

尚未实现全局设置模块。来源 WinForms `Settings/PKHeXSettings.cs` 声明 Startup、Backup、LocalResources、Legality、Converter、Import、SlotWrite、Privacy、SaveLanguage、Display、Sprite、Sounds、Hover、BattleTemplate、Draw、Advanced、EntityEditor、EntityDb、EncounterDb、MysteryDb、Report、SlotExport 共 22 个设置对象。`SettingsEditor.LoadSettings` 按 ReflectUtil.GetPropertiesCanWritePublicDeclared 获取非 null 对象，没有按 Browsable 属性过滤页面，因此标记 Browsable(false) 的 SlotExport 仍须纳入范围；来源语言文件也有 SettingsEditor.SlotExport 标签。

SlotExport 含 BoxExportSettings、DefaultBoxExportNamer 及默认 false 的 AllowBoxDataDrop，必须核对它们对实际导出／交互的作用。Startup.RecentlyLoadedMaxCount 为 uint，setter 截到 1–1000，默认 10；DefaultSaveVersion 通过 IsValidSavedVersion 后才更新，设置窗口另排除 0／GO／CP。启动加载、最近记录、备份与本机资源采用明确浏览器授权的本机副本路径对应，不扫描磁盘或声称已实现 EXE 插件加载。来源重置会删配置并重启进程，Web 应使用本机设置重置／重新初始化，不能照搬桌面退出行为。

后续逐设置对象核对 Core／工作流使用点、范围、三语及本机持久化；已有主题／语言和单模块选项不能代替全局设置接入。本段仅来源证据，不是功能实现或验收。

补充来源核对：Core SlotWriteSettings 的 SetUpdateDex／SetUpdatePKM／SetUpdateRecords／ModifyUnset 均默认 true，分别作用于图鉴、处理训练家与格式适配、获得计数和切换未保存提示；接入必须到写格位与切换入口，不能只保存四个开关。Privacy 的 HideSAVDetails／HideSecretDetails 默认 false。SaveLanguageSettings.Apply 针对 Gen1／Gen2／Gen3RS／Gen3FRLG 分别更新语言 fallback，版本只接受来源对应 IsGen1、GD／SI、R／S、FR／LG，不把设置覆盖所有已识别版本。WinForms Display 的 Unicode／FlagIllegal 默认 true，其余显示 bool 默认 false，FocusBorderDeflate 默认 1；DPI／剪贴板提示采用浏览器对应行为时需明确范围。SpriteSettings 包含蛋／相遇球、相遇颜色背景／条带、不匹配透明度／灰度与太晶条带，不能以现有静态 sprite 图片代替这些设置的实际反馈。以上仍仅只读核对，当前手动识别模块未提交前不开始设置模块代码。

Core `Editing/Program/StartupUtil.ReloadSettings` 还将 SlotWrite bool 映射为 SaveFile 静态 EntityImportOption、Import 映射 CommonEdits.ShowdownSetIVMarkings／ShowdownSetBehaviorNature、Legality 传 ParseSettings.Initialize、Converter 映射五个全局转换参数。该函数也扫描 Directory.Exists 的备份与神秘礼物路径，Web 不直接调用整个函数，逐项应用纯 Core 设置，文件仍从明确选择的本机副本获得。WinForms `MainWindow/Main.cs:ReloadProgramSettings` 另更新编辑器 ModifyPKM、隐私、非法格位、Hover、字体性别符号、SpriteBuilder、声音及备份扩展名。设置应随 Worker 重建重新应用，并明确编辑预览发生期间如何保持冻结结果；本段未宣称这些行为已接入。

SettingsEditor 的页面按翻译后当前文化排序并记忆最近页；默认空存档选择独立于 Startup PropertyGrid，排除 0／GO／CP，版本 setter 还要求 IsValidSavedVersion。Startup.RecentlyLoadedMaxCount 在加载路径时去重、只保留数量范围，Web 对应已有 save library 的明确本机文件记录。Legality 含八个嵌套对象，Nickname 再含各世代 NicknameRestriction；不能仅暴露第一层几个布尔值。转换默认 DisallowIncompatible／MissingDataHOME／Gen1 RD／Gen2 SI／不保留转移日期，实际行为来自 StartupUtil 指定的 EntityConverter 静态参数，而非独立前端猜测转换。

## 手动存档识别工具（SaveHandlerTroubleshooter，来源核对）

API163 工程收口：默认完整原生 `49264` 已退出 0，核心 `12273`、裁剪元数据、网页 `34704`、完整前端 `73623`（301 文件／1431 项）均通过；99 框架资源完全一致，原 E.sav 哈希保持。正式共享 Select 三语入口、来源参数目录、每请求 Worker 上下文、输出核验、撤销与重建重绑定、失败打开恢复旧选择已接。全部 32 类型和容器专项通过，不扩大通用编辑白名单或修改原件。下面的运行中／未接入描述为历史记录；当前待完成的是实际 Chrome 页面和所有者验收。最后格式后按授权提交推送本模块，完整目标仍未完成，全局设置等后续范围保留。

最新全类型专项 `9883` 已退出 0，覆盖全部 32 类型、GB 全来源版本／语言、Bank7 两版、Ranch 两版及既有 GCI／NSO／RTC／DSV／ARDS；每例使用独立来源构造或自动来源读取比较完整导出，核验原件不变。API163 公开上下文与生产编辑／确认路径专项也保持通过。核心 `12273`、裁剪元数据专项、新资产网页 `34704`、最后格式 `43593` 均已通过；完整前端 `73623` 包含全仓 Lint／类型与 301 文件／1431 项测试，通过并仅保留既有 Gen3Static 警告。99 框架资源一致，原 E.sav 哈希保持。默认完整原生 `49264` 仍在原活跃句柄，尚无总终态；本批未提交，Chrome 和所有者页面验收未完成。下列记录为开发过程与失败证据，以本段和 progress 最新记录判断当前状态。

全类型构造核验正在扩大，RS／FRLG 使用完整 sector 表，LA／SV／ZA 合成 LastSaved 合法日期，Stadium 使用与手动读取一致的 bytes 构造，避免来源空构造 ClearBoxes 失败。失败记录 89029／71634／74148／36530 保留；最新专项 32966 尚无终态，不能声明全部类型通过。生产来源不自动修正损坏日期或修改原件。格式与 Default／RTC 容器展示按三语，内部枚举／处理器标识继续匹配来源。

2026-10-14 API163 已加入公开来源目录及严格必填识别参数，独立 Worker 请求配置／finally 清理、客户端重建重发与输出重绑定、正式工具栏入口和共享 Select 三语表单。新文件自动打开时清除选择，打开失败或取消恢复旧工作区选择，撤销使用原选择重新绑定工作 bytes；最近记录保留原文件而不把手动结果伪造成自动样本。公开原生专项 `83498`、客户端一文件 92 项 `66246` 与定向 Lint `62215` 已退出 0；类型 `97301` 仍运行，尚无终态。GB 全来源子版本／语言扩大专项 `85608` 当前运行，编译输入冻结。本轮仍需其他类型覆盖、核心构建／裁剪、完整前端与默认原生检查；Chrome 仍未核验，未提交，不能声明该模块或完整 PKHeX 目标收尾。

2026-10-14 内部生产路径专项 `20291` 退出 0，覆盖 12 游戏原始存档、RTC、DSV、ARDS、九个 GCI 游戏／区域组合及四个 NSO 语言／RTC 组合。识别上下文专项验证自动识别失败的 DP 工作副本经正式 Inspect、ExportWorkingCopy、训练家 Export、SimpleTrainer 冻结预览／确认后仍保持所选构造方式；输出不改签名来伪造自动识别成功。当前文件读取使用 OpenCurrent，派生输出核验使用 OpenDerived，外来比较／数据库文件继续自动识别。清理、错误替换、撤销重绑定与 Worker 重建所需重绑定均有内部证据；公开协议／正式 UI 尚未接入，API162 保持。真实 E.sav SHA-256 仍为 `7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。Chrome 标签读取仍 fetch 失败，未完成浏览器或所有者验收。

本模块处于内部开发阶段。只读来源为 WinForms `Subforms/SaveHandlerTroubleshooter.cs`／Designer、Core `SaveUtil`、`SaveTypeInfo`、`SaveFileType` 及 `ISaveHandler`。来源选择全部非 None 类型、对应 GameUtil 子版本、全部 LanguageID 和 Default 加 SaveUtil.Handlers；无子版本时隐藏选择器并传 Any。浏览器使用明确选择文件，不读取或扫描用户输入的磁盘路径。

处理器顺序为 Default、FooterRTC、GCI、DeSmuME、ARDS、NSO。RTC 允许基础长度加 7 bytes 或 12–48 的偶数尾部；DSV 为 G4RAW+0x7A 且以 `|-DESMUME SAVE-|` 结束；ARDS 为 G4RAW+0xA4，无额外头部认证；GCI 为三个 GameCube 原长度+0x40 并核对四字符游戏代码；NSO 核对 SRAM 头及长度，最终写入须重算小写十六进制 SHA1 存档摘要。头／尾和 Handler 均由 Metadata 保存，不能将拆出的主体误称为原容器。

`SaveUtil.TryGetSaveFileHandler(..., handler, typeInfo)` 在成功 TrySplit 后调用 `GetSaveFileInternal(data, typeInfo)`，传入原 data 而非 split.Data；自动识别重载则使用 split.Data。此来源差异可能让手动头／尾格式错误地把容器当主体，后续必须通过各处理器完整文件对照确定修正，不能直接复刻该分支并宣称支持。原始 bytes、失败路径、选定类型／语言／子版本和正确容器导出均应单独验证。当前仅源码证据，不属于产品能力，也不缩小完整接入范围。

现有 `SaveService.Open` 每次以复制后的 bytes 调用自动 SaveUtil.GetSaveFile，前端保存原／工作 bytes 后也会在后续操作重新打开。因此手动识别不能只返回一次报告或把数据包装成可自动识别样本；选择的类型、子版本、语言和处理器必须绑定明确存档上下文，并在后续读取、编辑、撤销、导出和 Worker 重建时保留，切换存档时清理。原容器与 Metadata 的头／尾也须对应同一上下文，确认不可作用于另一个文件。

内部 `SaveDetection` 已加入全部 32 个非 None 类型的来源构造分支、六处理器顺序、严格参数／类型子版本／文件名检查及独立容器副本。修正手动路径的 split.Data 边界，Metadata 保留独立头／尾与所选处理器；文件输入沿现有 1 byte–32 MiB，本机名称沿 TextBox 默认 32767 字符，拒绝控制字符。构造器仍使用对应 Core 行为，不增加自动猜测或转换。API162 保持，无公开接口／Worker／正式 UI／识别上下文。本轮专项 `44554` 运行中（TEMP/pokerngkit-save-detection-native.log/.exit），只收原句柄、不改编译输入；仍需 GCI／NSO／区域／全部类型、完整错误恢复及上下文生命周期覆盖，不能据此标记模块完成。

原始／RTC／DeSmuME／ARDS 内部专项 `44554` 已退出 0，覆盖 12 游戏、完整独立输出、头尾／Metadata、结果修改不影响原件及错误参数。NSO 英／日、有无 RTC 与摘要重算新增专项 `2699` 在损坏构建长度仍被接受时失败；适配器现核对 split.Data 长度属于 HeaderInfoNSO.AllowedBaseSizes，拒绝把头部截入主体，未删除失败断言。修正专项 `48283` 当前运行（TEMP/pokerngkit-save-detection-nso-bounds.log/.exit），编译输入冻结；仍无公开上下文／接线，GCI 和其他类型／区域等范围保持待完成。

NSO 修正专项 `48283` 已退出 0，合法英／日与有无 RTC 四组合完整导出／摘要／原件保护保持，损坏构建长度拒绝；原始／RTC／DSV／ARDS 专项仍通过。仍为内部开发阶段，下一步补 GCI、其他类型／区域及识别上下文，不声明完整模块或目标完成。

## 基础训练家窗口（SAV_SimpleTrainer，API162 工程检查通过）

已核对 PKHeX 26.08.26 `Subforms/Save Editors/SAV_SimpleTrainer.cs`／Designer 与 Core `SAV1`、`SAV2`、`SAV3Colosseum`、`SAV3XD`。现有通用入口不覆盖 GB 代币／徽章／设置／皮卡丘字段，GC 游玩时间也未开放；这些属于本模块实际缺口，不以已有 DS 日期能力代替。

内部 `SimpleTrainerEditing` 读取额外字段，在独立克隆中逐项编辑或按来源控件顺序重新保存。GB 徽章宽度为 8／16 位；第二世代 UI 调换第 5／6 个勾选控件的位置，仍使用各自原位编号构造掩码。代币上限来自 `MaxCoins`，输入掩码按上限十进制位数设置。皮卡丘亲密度为 0–255／三位，海滩分数为 0–9999／四位，仅 Yellow 暴露编辑；原窗口重新保存仍写入隐藏皮卡丘字段。文本速度 0–7、战斗模式／动画 0–1；第一世代声音 0–3，第二世代选择 0／1 对应 Core 的 0／2。普通编辑保留未改字节及异常旧值。

游玩时间沿来源五位小时／两位分钟和秒：小时解析为 ushort（0–65535），分钟和秒新输入 0–99，写入取余 60。第一世代小时 setter 在 255 及以上截到 255、设置最大时间标志并清理其余时间，随后来源仍写分钟和秒；竞技场以浮点秒、XD 按地区以浮点或双精度秒保存，需按真实 setter 顺序核验，不能宣称全部输入精确可表示。DS 地图范围为 0–1000／X、Y 0–65535／Z ±65535，未编辑地图时整窗保存不重写坐标。

DS 日期／时钟控件分别保存日历和时钟，允许 2099-12-31 当天完整秒数；冒险日历最小 2000，名人堂日历无显式 MinDate，但原 uint epoch 无法表示负秒数。Web 保留现有 unsigned 转换修正，不复现 DateUtil 在 2068 年后的 signed-int 溢出。来源整窗保存对 G5 两个 ulong 日期调用低 uint 属性 setter，需明确覆盖高位重写；普通字段编辑继续保留未改高位。

当前仅内部读写层和专项断言，API161 保持，尚无公开 Worker 接线及正式 UI。专项 `37547` 正在运行（TEMP/pokerngkit-simple-trainer-native.log/.exit），编译输入冻结，只收现有句柄。当前不声明完整检查或模块完成；仍需完整来源保存对照、GC 精度／格式夹具、三语入口与冻结预览／确认、最新核心／裁剪／完整工程和实际浏览器核验。

最新内部专项 `66245` 退出 0（TEMP/pokerngkit-simple-trainer-session-gb.log/.exit）。GB 英／日 RB、Yellow、GS、Crystal 全部设置组合及代币／徽章／时间／皮卡丘边界、GB 时间掩码及最大标志联动、E／五种 DS 来源保存／日期边界通过；竞技场／XD 补齐各槽识别头签名，以完整加密容器自动识别、独立 setter 顺序／精度和校验对照通过，不再依赖指定格式绕过识别。`SimpleTrainerSession` 冻结完整输出，一次确认、替换／旧取消、过期原数据与失败准备清理覆盖 GB、E、竞技场和 XD。源码未修改 Core；GB/GBA `CloneInternal` 调用 GetFinalData 会整理源对象，新适配器在 finally 恢复源数据与 Edited 状态，独立测试参照从原 bytes 重新读取，原缓冲、队伍、箱子数据检查保持。

前端 `simpleTrainer` 16 项范围／旧值／字段归属专项及校验层 Lint 通过。三语 `SimpleTrainerEditor` 已写组件，复用共享 Select、字段、工具条和预览，未挂载到正式工作区。首轮界面 Lint 因 render 内更新 refs 失败，已移到 effect；最新 Lint 通过，类型 `53850` 尚在运行。仍未接公开 JSON／JSExport、客户端／Worker／主入口，API161 保持；基础身份的 GB 主入口、完整重保存差异预览及其他区域夹具还需继续核对。完整工程门槛、提交与页面验收未完成。

公开 JSON／JSExport 已加入读取、冻结预览、一次确认和指定令牌取消；来源生成 JSON 记录要求 Action／SourceHash 与确认三字段，请求上限 32767 字符、确认 4096。错误／缺失 JSON 清除旧预览。专项 `99013` 和最后时间修订 `8706` 退出 0，覆盖 GB 英／日、E、竞技场／XD 的公开 JSON／冻结完整导出与失败清理。逐项时间编辑按小时、分钟、秒顺序恢复省略的原时间分量，避免第一世代最大小时／XD 小时 setter 清零其他分量；小时单项完整文件对照通过。整窗重新保存仍沿来源掩码／setter 的全部行为。

界面补齐既有徽章网格／复选框样式，取消卸载后迟到的预览，只提交确认字段而不把显示对象发送给 Core。首轮类型 `53850` 因测试对象数组推断出 undefined 字段失败，改显式字典类型；前端 16 项及定向 Lint 重跑通过，修正后的类型 `93389` 已退出 0；末次确认对象字段提取等界面逻辑改动仍由后续完整 verify 收口。当前 Native 接口尚未重建到浏览器资源，客户端／Worker／正式入口未接，版本仍为开发基线 API161。后续必须完成协议升级与正式接线、完整来源保存差异预览、其余区域夹具、最新核心／裁剪／完整 verify／默认完整原生与浏览器核验；本批未提交。

API162 已接正式训练家页、客户端请求、Worker 与握手，四种操作走独立冻结令牌；确认复用完整工作副本／历史撤销／导出，不把显示对象提交为确认。原有基础字段与补充工具草稿互斥。GB 只开放训练家能力，不据此开放普通宝可梦编辑；里 ID 控件隐藏，Native 拒绝非零新 SID。基础训练家来源 TextBox 没有 MinLength，GB、GBA、GC、DS 的空姓名按来源允许，仍核对字符、实际编码和上限。金钱／代币最大值按钮共用 44px 的金额操作布局；徽章与候选沿既有控件。

预览新增来源／结果完整字段目录，按三语显示姓名、金钱、时间、国家／地区、日期及 G5 日期高位的实际变化；第一世代时间帧数／上限标记也可核对。原生专项 `92663` 退出 0，包含公开 GB 身份、空姓名／最大金钱／隐藏 SID、完整文件原件保护，以及 G5 高位清零的冻结预览／导出。前端三文件 `80064` 的 130 项通过、定向 Lint 通过，类型仍同一流水线；首轮原生因测试 MaxMoney 的 int→uint 参数失败已修正。地区扩大专项 `59335` 正在运行（TEMP/pokerngkit-simple-trainer-regions.log/.exit），追加韩国 GS 与 XD 日版浮点布局，不改编译输入、不重复启动。最后姓名行为修订的前端 `55299` 运行中。浏览器 Core 资源尚未重建，仍需最新核心／裁剪／完整 verify／默认完整原生、资源一致和真实页面核验；本批未提交，不宣称整体接入完成。

地区扩大 `59335`、姓名修订三文件 130 项 `55299` 与浏览器核心 `32863` 已退出 0。日版 XD 通过影子表 0x1E00 长度明确选择浮点时间布局；韩国 GS 自动识别及专属校验布局／冻结导出通过。首轮接线类型 `80064` 因工作区应用函数返回 void 而失败，现用实际应用回调返回成功标记，修正后类型 `30788` 已退出 0；末次界面 Lint `12057` 通过。空补充字段区不渲染，不挤占 GBA／DS 重新保存工具空间。

最后裁剪→默认完整原生串行 `85811` 与完整前端 verify `87470` 已启动，日志为 TEMP/pokerngkit-simple-trainer-trim／full／verify.log/.exit；只收现有句柄、不改原生编译输入、不重复启动。Native API162 已重建到 public/pkhex/_framework，需在完整网页构建后核对 public／dist。Chrome 最新仍 tabs 空、nodeRepl.fetch request failed，实际页面／所有者验收未完成。本批未提交，完整工程终态及最后格式后再按既有授权普通提交推送。

完整 verify `87470` 已退出 0，301 文件／1429 项及网页／PWA 257 项（24762.72KiB）通过。99 个框架文件 public／dist 哈希一致，原 E.sav 哈希保持；裁剪已通过，默认完整原生 `85811` 仍运行，尚无总终态。源码未追加，不重启检查；原生终态后再最后记录／格式与普通提交推送。真实页面、浏览器工作副本／撤销／下载及所有者验收仍待完成。

默认完整原生 `85811` 已最终退出 0，覆盖新增基础训练家与全部既有模块；核心、裁剪、完整前端和资源一致性检查已收齐。最后文档与全仓格式后普通提交推送，标题 `feat: 补齐基础训练家编辑与保存`。这些结果是工程证据，真实 Chrome 页面及所有者验收仍未完成，完整 PKHeX 接入目标保持。

## 相遇数据库（SAV_Encounters，API158 开发阶段）

来源已读取WinForms `Subforms/SAV_Encounters.cs`／Designer及Core `SearchSettings`、`EncounterMovesetGenerator`、`EncounterCriteria`、`EncounterDatabaseSettings`和`TrainerDatabase`。现有相遇字段编辑器不覆盖该数据库：需独立模板检索、类型筛选、条件生成、训练家来源、转换和完整准备编辑。

输入为种类ushort、原游戏GameVersion、四个招式ushort、蛋／固定异色三态、非零EncounterTypeGroup集合与只读属性指令。候选沿源GameInfo数据，不把种类强限为当前存档MaxSpeciesID；无种类时枚举1..存档MaxSpeciesID。四个招式由SearchSettings.AddMove去重。RTB_Instructions未设置MaxLength，Web明确采用32767字符上限；结果最多100000个，超过时拒绝，不截断。类型默认全选，无类型不可检索；ReturnNoneIfEmptySearch、FilterUnavailableSpecies、UseTabsAsCriteria及UseTabsAsCriteriaAnySpecies默认true；行数默认9，源设置Clamp 5..20。

检索逐种类／形态排除战斗专用形态，必要时沿源回退USUM形态表；OptimizeCriteria后调用Core.GenerateEncounters，再按蛋／固定异色、源引用身份、在场规则和属性指令筛选。PriorityList仅在同步消费检索期间修改，finally恢复Core默认。条件从ShowdownSet、EncounterMutationUtil和GetCriteria取得；可极限特训时将31 IV按源改为随机。生成沿进化链／单一性别／可行特性调整条件，TrainerDatabase按版本与旧世代语言匹配，缺失时回退当前存档；ConvertToPKM后转换当前PKMType、AdaptToSaveFile并更新校验。全部操作使用存档和编辑实体副本，训练家也注册副本。

当前已加入 `PokemonEncounterDatabase` 与 `PokemonEncounterSession` 内部模型。生成预览冻结一次转换后的完整实体数据，确认仅返回冻结文件；错误确认、失败替换、重新检索、取消及存档变化清除旧预览。GB 使用完整单体列表，其余格式使用解密队伍数据，原文件不改动。Battle Revolution 另核对当前档位，避免加密 bytes 相同而档位不同。

原生专项 `24384`、`81235`、`67441` 均退出 0。覆盖 13 个游戏存档夹具及 11 个额外存档环境的完整类型／形态／版本序列、四招式及重复去除、蛋／固定异色／属性指令、可用种类设置、全部自定义条件字段、进化链／性别／特性调整、训练家副本及回退、当前格式生成和原缓冲区保护；生命周期覆盖冻结哈希、一次确认、错误取消令牌、取消、失败生成、重新搜索和过期存档。XD 与 RSBox 使用可克隆的合成底层容器，不将上游空白构造器缺少序列化数据误当产品问题。最新日志为 `TEMP/pokerngkit-encounter-database-session.log/.exit`。

API158 已接公开 JSExport、来源生成 JSON 和 Worker／客户端通道：打开、检索／分页、候选目录、条件修改／从编辑器载入／重置、生成预览、确认、取消和清会话。打开可从当前物理格位或明确格式的独立实体读取编辑条件，不同时接两种来源。目录的种类／游戏沿全局来源，招式沿当前存档 FilteredGameDataSource，三语由 Core 数据提供；返回 6 列乘设置行数的页面，分页保持模板 ID，不再次检索或生成。

条件传输保留所有字段：性别 byte、特性 sbyte、性格／异色 byte、六项 IV／觉醒力量／形态 sbyte、等级上下限 byte、变更许可 byte flags。枚举拒绝未定义值，数字保持原 PropertyGrid 的 CLR 全范围，不额外推测限制。训练家来源包含版本、姓名、TID／SID、性别、语言与 3DS 地域，最多 1024 条、本地注册副本。条件变化使旧预览失效并保留结果。

公开原生专项 `85529`、修正后 `22831` 均退出 0，覆盖 13 游戏的完整来源候选／分页顺序、冻结输出哈希、完整实体编辑器回读及失败清理；前端客户端 `86828` 为 86 项通过。Core 相遇和礼物模板反射属性加入裁剪保留根，裁剪检测展开 wildcard 到原始具体类型并逐项核对属性签名与访问器。核心重建／裁剪检查 `82331` 正在串行运行，日志 `TEMP/pokerngkit-encounter-core.log/.exit`、`TEMP/pokerngkit-encounter-trim.log/.exit`；类型／定向 Lint `54432` 正在运行，不重复启动或修改原生编译输入。

正式存档导航已加入相遇数据库，采用检索／生成条件／训练家来源／设置四个分组；共享候选输入、Select 和现有 44px 控件基线，图像结果使用 6 列可滚动格位和已有干净箱子壁纸。Core 根据原版 SpriteUtil 的固定性别／GO 性别、上下文、形态和蛋选择资源键，中英日说明由 GetTextLines 的语言参数提供。类型勾选按源枚举顺序提交，Shift 可独选；条件草稿未应用时禁用生成，避免草稿与实际条件不一致。

来源可选空白、当前箱子／队伍物理格位及本机独立实体文件。生成确认后复用完整 StandalonePokemonPanel 与数据库工作区，支持加入本机库／导入当前存档的冻结预览与确认、编辑导出及既有联合撤销；准备编辑器保留挂载，切换回检索或语言时保留实体编辑。准备编辑后的副本可直接作为新生成条件来源，不要求先下载。替换准备实体前显示编辑丢弃说明并明确确认。只读属性指令构建器沿源格式／属性／比较前缀与当前值，输入指令仍由 Core 执行。

训练家来源可增加／移除，完整编辑版本、姓名、TID／SID、性别、语言及 3DS 地域；语言候选来自 Core 全目录，包含 Z-A 的拉美西班牙语。设置和训练家仅存本机 localStorage，保存后重新载入并校验，不扫描目录或上传。损坏存储退回默认，Core 拒绝旧参考时仍载入默认来源候选供修正。初始打开先经过微任务检查活动状态，避免 React StrictMode 的废弃初始化抢占父 Worker。条件／来源／确认失败沿用原件保护与本地化错误提示。

修正 PGL 错误保留项后 `2426` 核心与 wildcard 展开的完整属性／访问器裁剪专项退出 0；三语说明／精灵修订 `16536` 与 16 个 Battle Revolution 地区／分区／档位来源检查 `63932` 退出 0。前端来源／设置／导航／客户端 `77537` 三文件 109 项通过。首轮界面类型 `42872` 发现准备 state 缺少 undefined 联合与不存在的 boxes.slots，已分别修正，不以该轮失败输出声明最终类型通过。

完整目录／只读构建器后的原生 `75855` 专项、核心、裁剪及默认完整原生全部退出 0；日志为 TEMP/pokerngkit-encounter-final-native、final-core、final-trim、final-full.log/.exit。类型／定向 Lint `6053` 与末次构建器／界面定向 Lint `36166` 退出 0。最后前端完整 verify `49795` 退出 0，293 文件／1380 项、类型、网页及 PWA 257 项（24710.99KiB）通过；99 个框架文件 public／dist 哈希一致，保留既有 Hook 与大 chunk 提示。交接文档后的全仓格式 `79029` 退出 0。本批进入普通提交推送收尾；外部 Chrome 仍 id4／tabs 空／fetch 失败，正式页面、真实 IndexedDB 和所有者验收仍未完成。E.sav 原件 SHA-256 保持，工程通过不替代页面验收。

2026-09-22 开始开发。入口位于主导航存档编辑，原悬浮菜单保留快捷入口，使用本地 `PKHeX.Core` 26.08.26 源码；
来源、归属与逐文件哈希见 [UPSTREAM](../../third_party/pkhex/UPSTREAM.md)。

## 神秘礼物数据库（SAV_MysteryGiftDB，API160，工程检查通过）

已只读核对 PKHeX 26.08.26 SAV_MysteryGiftDB.cs／Designer、MysteryGiftDatabaseSettings、EncounterEvent、MysteryGift／DataMysteryGift 与 WA9。本模块独立于存档配信卡编辑器，须接完整来源数据库、检索、指令构建器、准备宝可梦、原格式宝可梦导出、礼物原文件导出和全部结果导出；内部检索／生成会话已开始开发，公开协议与产品页面尚未接入，不以既有配信卡窗口代替。

来源结果网格六列，行数 5–20，默认 9；隐藏不可间接接收物种默认启用。GetAllEvents 依物种稳定排序，合并 G4–G9／Let's Go／LA／BDSP／Z-A 的内置与显式外部礼物，过滤掉道具、非实体和零种类。种类来自当前存档过滤目录并限于原始结果中的种类，道具沿当前 Items，招式沿 Moves 移除 None 后加入 Any；Any=-1。四个招式分别 HasMove，蛋／固定异色三态分别判断 IsEgg／IsShiny。世代比较 Any／>=／==／<=，格式索引按 MAXFORMAT+1-index 映射；来源构造器先选 <=，显示阶段会重置筛选候选，须核对最终默认值。非空且无空行指令使用 GetFilters、ScreenStrings 与 BatchEditingUtil.IsFilterMatch；不得将实体编辑指令写到礼物模板。

查看先以当前存档和 Unrestricted 生成，再转换至当前 PKMType、AdaptToSaveFile 和 RefreshChecksum；保存宝可梦则直接导出 gift.ConvertToPKM(SAV) 的原始实体格式，两个动作不可合并成同一转换路径。每次随机生成需冻结一次，预览／确认／下载不得重掷。单个礼物及批量导出只支持 DataMysteryGift，沿 gift.Write 和 CleanFileName；无原始数据的模板需明确不可导出。Web 用明确文件选择、本机保存与 ZIP 对应文件夹操作，不能声称打开 Explorer。重复文件名的 ZIP 处理须单独记录，保留全部礼物。

原版载入将 GiftUsed 置 false；网页须先复制，避免修改 Core 静态库。WA9.Clone 实际返回 WC9，故副本不能直接依赖通用 Clone；需按真实运行时类型复制完整 Data，分别检查原始库／外部文件不变及 Z-A 类型保持。内部复制已用各运行时类型构造器保留完整 Data，未改第三方源码；专项正在核对全部内置模板与原件不变。

内部 MysteryGiftDatabase 与 MysteryGiftDatabaseSession 已加入：完整来源序列／Presence、世代四种比较、种类／道具／四招式／蛋／固定异色及只读属性指令、单个／全部原始礼物导出；生成分原生格式与当前存档转换两条路径。预览绑定原文件哈希和 BR 当前档位、冻结完整实体一次，确认／搜索／取消／失败预览释放缓存。API159 保持，尚无新 JSExport／Worker／正式三语图像页面／本机礼物库／ZIP联动，模块未完成。13 游戏专项已加入；首轮 `13289` 因测试误用 PokemonFile.Name 编译失败，改为 FileName 后当前串行 `31239` 重跑（TEMP/pokerngkit-mystery-gift-native2.log/.exit），原生输入冻结，只收该句柄。全仓格式 `74379` 当前运行中，后续文档批须再格式收尾。

修订内部专项 `31239` 已退出 0（TEMP/pokerngkit-mystery-gift-native2.log/.exit）。13 游戏 × 两种 Presence 设置的完整序列、世代比较、字段组合、来源指令、完整礼物 bytes 导出，以及原生／转换实体冻结生命周期通过；原 Core 数据逐项保持。当前原生检查终态，无运行中的编译输入。下一步接三语候选与公开会话 JSON／JSExport，再接 Worker、图像页面、本机外部礼物与 ZIP，不能以此内部专项声明产品功能完成。

API160 公开接口／JSON 来源生成与 Worker／客户端已接：打开、完整分页／筛选、三语来源候选、来源精灵键／礼物详情、原生及当前格式生成预览／确认、单个／全部礼物导出与取消／重置。候选以英文来源顺序保持 ID，其他语言逐编号映射其准确来源名称，不假设三语各自排序相同。构建器读取明确准备实体，未给实体使用存档空模板。外部礼物按扩展名和严格长度由 Core 识别，实体／非道具／非零种类沿来源条件加入排序，不修改全局 EGDB；最多 1024 文件、16MiB 原数据与 24MiB JSON 为浏览器资源限制，单文件 base64 最大 64KiB。无法识别文件拒绝整次开库并清除旧会话；准备动作两个字段均 JsonRequired。

公开专项首轮排序对照错误已修正，`63532` 最终退出 0：13 游戏全页／编号、三语全部候选名称、详情和图像、原源不变、必需输入、外部 WA9、开库失败重置和精确冻结输出通过。前端协议／客户端两文件 90 项及定向 Lint `88565` 通过；类型 `60790`、核心／裁剪串行 `51975` 运行中，原生输入冻结。版本仅保留协议 159→160，误触无关字符范围／图片索引／旧夹具编号与偏移已恢复。当前尚无正式页面、只读构建器／完整编辑器联动、外部礼物 IndexedDB 和 ZIP；不会以内部及公开专项替代产品完整接入或浏览器验收。

正式存档导航已加入神秘礼物数据库，页面使用来源清爽壁纸、六列精灵网格、物种／道具／四招式共享候选、蛋／固定异色三态、世代比较、全部详情与只读属性构建器；三语操作与 44px 原控件基线沿现有规则，不另写控件皮肤。原格式生成确认下载、当前存档转换确认后的完整宝可梦编辑器及既有数据库／存档导入路径已接；编辑器属性可回读构建器，准备对象保留编辑状态。设置沿 5–20 行和默认 9，保存本机 localStorage。世代 Any 对应来源隐藏索引零的 MAXFORMAT+1=10，启用比较时选择当前存档世代，低于四世代则 Any，未重解释为第零世代。

外部礼物库使用独立 IndexedDB 单快照，逐文件保留 UUID／名称／原 bytes 的 base64／时间；revision 与完整内容同时检查，CAS 或配额失败保持旧库，读取／返回对象独立。Core 检查完整输入后才写库；旧保存文件无法由当前 Core 打开时仍显示本机文件列表供移除／撤销，不锁死恢复入口。明确文件添加、所选副本移除、库撤销及重载已接；关闭页面后失败恢复不再覆盖新页面的 Core 会话。原礼物导出仍沿 gift.Write；全部结果 ZIP 每个文件置于唯一六位编号目录，避免桌面同名文件覆盖，保留所有结果，无 Explorer／磁盘删除宣称。

核心／裁剪串行 `51975` 均退出 0（TEMP/pokerngkit-mystery-gift-core／trim.log/.exit）；前轮类型 `60790` 退出 0。98 项前端专项通过库原子写入／冲突／副本隔离／原 bytes、三语静态 markup 和客户端，SSR 不能替代实际交互检查。最新页面类型 `6145` 正在执行，定向 Lint `64808` 退出 0；最后编辑器属性与失败恢复修订仍需末次工程门槛。Chrome 本轮仍 tabs 空并 fetch 失败；真实图像页面／IndexedDB／下载及所有者验收未完成。本批尚未提交，不能据此标记完整 PKHeX 目标完成。

最后来源修订确认比较组位于 FLP_Format，不在 OnShown 的直接 ComboBox 重置范围，初始保持 <= 当前世代；三世代选择索引越界回 Any=10。重置筛选只清种类／道具／招式／蛋／异色／指令，不重置世代比较组。此前默认 Any 比较已修正并纳入前端专项。共享属性构建器可读取完整编辑器已准备属性；卸载后的失败恢复不会重开覆盖新会话。

前轮页面类型 `6145` 发现未安装 fflate 并退出 2，现已将 ZIP 改为 Core System.IO.Compression.ZipArchive／JSExport，在 Worker 中生成和转移缓冲，不添加依赖、不在 UI 线程压缩。来源原 bytes 与全部文件保留，逐回解 ZIP 对照和同名礼物独立目录测试加入；原生 `38020` 运行中。最后四文件 98 项通过，类型同句柄 `3077` 继续执行；早先 `51975` 核心／裁剪证据不覆盖最后 ZIP 新导出，当前完整工程门槛尚未完成。本批未提交，仍需最后格式／Lint、最新核心／裁剪／完整前端／默认完整原生及真实浏览器核验。

末次 ZIP／公开专项 `38020`、类型 `3077`、全仓格式 `22596` 与末次 Lint `88561` 已退出 0。最终串行 `90401` 的核心重建已退出 0，含最新 ZIP JSExport，后续 property-trim／默认完整原生仍同一流水线；完整前端 verify `5983` 已启动。日志分别 TEMP/pokerngkit-mystery-gift-final-core／trim／full／verify.log/.exit。当前不改原生输入、不重复启动，不提前声明完整门槛、提交或页面验收完成。

最终完整 verify `5983` 退出 0：299 文件／1408 项、类型、网页与 PWA 257 项（24749.72KiB）通过。99 框架文件 public／dist 一致，原 E.sav 哈希保持；核对清单末次全仓格式 `82062` 退出 0。最新核心／property-trim `90401` 已退出 0，默认完整原生仍同一活跃句柄。当前不改编译输入、不重复启动；完整原生终态后再普通提交推送。Chrome 直接读取授权 URL 仍 fetch 失败，真实页面／IndexedDB／实际下载和所有者验收未完成。

最终串行 `90401` 最新核心／property-trim／默认完整原生全部退出 0；完整 verify `5983` 退出 0，299 文件／1408 项、网页和 PWA 257 项（24749.72KiB）通过。99 框架文件 public／dist 哈希一致，原 E.sav 保持；交接格式 `61296` 退出 0。最后记录／格式后按已有授权普通提交推送，标题 `feat: 接入神秘礼物数据库与图像检索`。这些结果为完整工程证据；正式页面、真实 IndexedDB／下载和所有者验收仍未完成，不能宣称整个 PKHeX 接入目标已完成。

## 阿尔宙斯研究任务面板（API161，工程检查通过）

来源为 PKHeX 26.08.26 PokedexResearchTask8aPanel.cs／Designer、PokedexResearchTask8a.cs 与既有 LegendsPokedex。当前值沿 NumericUpDown 的十进制 0–60000，原未修改 ushort 高值保持；任务阈值为 Core 的 byte 数组，MaskedTextBox 使用 999 掩码且 Enabled=false，不开放阈值编辑。来源 ReportedCount=reportedLevel-1，GetTaskColor 逐索引比较当前值与阈值、索引是否小于 ReportedCount：已达成且已汇报、已达成待汇报、已汇报但当前未达、尚未达成。相等即已达成，不能只看已汇报计数或累计点数。源 FlowLayout 为 RightToLeft，并逆序加入控件，视觉仍按阈值原序；Web 保持 Core 原序并以文字与语义颜色显示状态。

API161 为 Dex8aTask 增加独立 BonusPoints，直接取 task.PointsBonus；Points 仍为 PointsSingle+PointsBonus，编辑和研究点数计算不变。不可从总点数猜测奖励标记。页面在既有任务表内显示四状态及当前草稿／派生形态的实时预览，不新增操作或重复计数模型。既有计数输入、汇报／高级计数、工作副本／撤销／导出保持原路径；标签三语，最小辅助文字 13px，不以颜色独立表达状态，不改变共享控件几何。

原版 research_bonus_points PNG 未修改导入，脚本 scripts/import-pkhex-research-art.mjs 核对 Resources.resx、PNG 签名与已有哈希后写入既有两个 manifest。来源 PKHeX.WinForms/Resources/img/Pokedex/research_bonus_points.png，483 bytes，SHA-256 4803A0624B2C382A917E23E35CB3346C5C8543F4F54CEEB98054695581EC84FC；图像沿同一 PKHeX GPL 归属，无运行时 CDN。API／Worker／独立实体握手及相关断言仅替换协议字段 160→161，不替换普通数值或图像编号。

前端两文件 11 项专项已通过，覆盖等于阈值、报送进度回退、原始高值、三语状态与奖金图像、无奖励隐藏图像以及旧编辑保护。当前原生／全仓格式串行 `46033`（TEMP/pokerngkit-research-task-format、native.log/.exit）和类型／定向 Lint `67566`（TEMP/pokerngkit-research-task-types、lint.log/.exit）运行中，只收现有句柄；未提交本批，核心／裁剪／完整工程和真实页面仍待核验。上一神秘礼物目标已提交，整体完整接入目标继续。

两修订原生专项 `46033`、类型／定向 Lint `67566` 与全仓格式 `11356` 均退出 0；新增断言逐种类／任务核对 BonusPoints、总点数与阈值原序，原有全部读写／汇报／原件保护检查仍通过。额外点数标签明确为总点数拆分，计算路径未变。最新核心→property-trim 串行 `64870` 运行中（TEMP/pokerngkit-research-task-core／trim.log/.exit），不修改编译输入、不重复启动；后续仍需最终完整前端与默认完整原生、资源匹配、末次文档格式及真实浏览器核验。当前开发批未提交，不据此声明整体目标完成。

最新核心／property-trim 串行 `64870` 已全部退出 0；完整前端 verify `46958`、默认完整原生 `44369` 当前运行（TEMP/pokerngkit-research-task-final-verify／full.log/.exit），只收原句柄、不改编译输入、不重复启动。尚未提交；完整门槛成功后匹配资源和末次格式，再普通提交推送。后续 SimpleTrainer 日期已有通用实现，库存已纠正为来源范围／完整重保存核对，不把旧待办说明当成不存在的功能。

最终完整 verify `46958` 退出 0，300 文件／1412 项、类型、网页与 PWA 257 项（24752.02KiB）通过。99 框架文件 public／dist 一致，原版研究图标两目录哈希一致且保持来源哈希，原 E.sav 哈希保持。默认完整原生 `44369` 仍同一活跃句柄；不改编译输入、不重复启动，终态后再最后记录／格式与普通提交推送。浏览器／真实存档及所有者验收仍待完成，当前不声明整体目标完成。

最终默认完整原生 `44369` 已退出 0，覆盖新增研究任务断言与全部既有检查；核心／property-trim `64870`、完整前端 `46958` 均通过。当前模块工程门槛已收齐。Chrome 最新连接仍返回 `nodeRepl.fetch request failed`，实际页面、真实存档交互与所有者验收待完成；完整 PKHeX 接入范围保持。

## 存档目录列表（SAV_FolderList，API159，工程检查通过）

只读核对 `Subforms/SAV_FolderList.cs` 与 Core `Editing/Saves/Management/SavePreview.cs`。原版分最近与备份列表，列为训练家姓名、世代、游戏、游玩时间、文件 UTC 时间、显示 TID／SID、文件夹及文件名；最近文件去重，排序后重新执行筛选。任意列模式显示全部并禁用文本筛选；单列使用 CurrentCultureIgnoreCase 的包含判断，空文本显示全部，空单元格不匹配。SavePreview 的 Played 补零至 9 字符，FileTime 使用 `yyyy.MM.dd:hh:mm:ss`（12 小时格式，不能悄悄改成 24 小时并称同源）。训练家 ID 格式由 Core 的 TrainerIDDisplayFormat 决定。

桌面扫描逻辑驱动器、3DS／Switch 常用路径、其他备份路径及历史路径，并带 20 秒取消；浏览器应以明确选择本地文件／目录和本机最近记录对应，不进行自动全盘扫描或伪造磁盘路径。打开进入存档工作区；系统 Explorer 打开所在目录属于桌面专属行为，Web 可展示选定相对目录，不能声称等价启动 Explorer。原版 DeleteSaveFile 在 RemoveAt 后再读取 parent[item].FilePath，删除最后行会越界、其他行可能用错文件身份；后续必须先固定原文件身份，再删除所选源或列表中的引用，并区分这两种操作。CleanBackups 会删除未识别文件、删除同名备份或移动文件，不得以只读列表加载隐式触发。

内部 `SaveFolderList` 已加入明确文件来源、Core 识别、九列预览、最近／备份归属、九列实际 CLR Comparer 排序与三个文化的单列包含筛选。最近来源按源 IsBackupFilePath 排除严格小写 `backup` 和 `.bak`，明确历史记录可例外加入。读取把路径传给 Core 的容器处理，沿原版先设置 metadata，再调用旧世代 SaveLanguage.TryRevise；单文件识别异常只记失败，不阻断其他文件。原始文件和 Open 返回值保持独立副本。

清理仅返回 remove／rename 计划，名称来自 Core.GetBackupFileName；同名碰撞按明确文件夹组区分，未识别文件只有显式 deleteUnrecognized 计划才包含，不实际操作原文件。资源上限为 1024 个文件、单个 32 MiB、总 128 MiB；过滤文本默认 TextBox 未设置 MaxLength，沿 32767；列号 -1 表示任意，0–8 为源顺序。文件时间显式 Unix 毫秒 0–253402300799999 转 UTC 后沿原 12 小时文本格式。Culture 仅 zh-CN／en-US／ja-JP，在 finally 恢复 Worker 文化。

修正首轮测试 with 初始化语法后专项 `97109` 退出 0，覆盖 13 存档、源字段、两个列表／九列／三文化、备份命名规则、打开副本、清理碰撞计划与原件保护。语言识别与读取异常修订及单独 rename／跨目录同名扩大专项 `77382` 退出 0，日志 TEMP/pokerngkit-save-folder-native3.log/.exit；全部检查保留原文件，仅生成清理计划。

公开 JSON／Worker 已按 API159 接打开列表、分页筛选、打开原容器、清理／移除预览、确认差异、取消和清会话。该通道不依赖已打开存档，不伪造 SaveReport；明确文件通过独立二进制分包传输，元数据连续 offset／length、ID 唯一及总长度均核对，必需 JSON 字段使用来源生成检查。

`SaveFolderSession` 绑定全部文件内容、ID、原名称、目录组、修改时间、最近／备份／历史归属和顺序。预览冻结全部输出，确认仅返回对应差异；一次确认、替换、错误确认、失败预览、取消和旧源均清除缓存。可修改的显示计划不影响冻结数据，返回打开／确认副本不影响内部源。备份清理只处理文件名不含路径分隔符的条目；浏览器目录选择把子目录各自保存为父目录组，所以整理覆盖本机库内所有明确标记的备份组，不随当前筛选缩小范围。此范围与桌面单目录非递归扫描不同，冻结预览逐项列出并要求确认，原磁盘文件不改动。

冻结专项 `82212` 与修正 List 转数组后的公开专项 `28297` 均退出 0，覆盖所有元数据绑定、显示计划隔离、JSON 缺失字段、连续切片、精确容器打开及失败清理。前端目录协议／客户端两文件 95 项及类型 `15396`、全仓格式 `76273` 已通过。

正式工作区顶部已接存档目录入口，未打开存档时也可访问；最近／备份／目录三标签、文件／目录选择、九列筛选和排序、50 条分页、打开／下载副本、清理／移除预览及本机撤销已接。独立 Worker 不依赖当前存档。列名、游戏／版本组、动作和错误均三语；游戏名称来自 Core.VersionDataSource，时间列明确 UTC。

`saveFolderRepository` 使用独立 IndexedDB 原子快照及 UUID revision，跨标签旧版本拒绝覆盖；所有 bytes 复制，读取损坏或不可用存储明确失败，写入失败保持旧库。清理确认返回的差异可保留后重试存储，无须重复消费 Core 令牌。最近记录来自成功打开的原容器副本，源文件不改动；目录选择按相对路径保留父目录组、同名独立 ID。文件导入、清理和移除后可撤销库更新；导出是浏览器下载副本，磁盘删除／Explorer 跳转没有伪装为 Web 能力。

存储事务／协议／客户端三文件 98 项通过，包含旧 revision、配额失败和 bytes 隔离。游戏三语修订 `2737` 原生专项退出 0；去除多余 context 后的来源名称对照 `58010` 运行中（TEMP/pokerngkit-save-folder-ui-native.log/.exit）。初稿 Lint `13600` 仅一条 client ref cleanup warning，已捕获 effect 内客户端修正；界面类型／末次 Lint `5509` 正在运行（TEMP/pokerngkit-save-folder-ui-types.log/.exit 和 ui-final-lint.log/.exit），原打开作用域误收已修正，仍须以末次检查为准。下一步收当前句柄、补完整工程与外部浏览器核验；本批未提交，模块不声明验收。

可靠性修订：来源名称对照 `58010` 与跨语言哈希向量原生 `81153` 已退出 0；前端协议／库事务／客户端扩大到 100 项通过，最后定向 Lint 退出 0。分页使用已应用查询，草稿不在翻页时隐式生效。保存前同时核对 revision、完整文件元数据／顺序／bytes；Core 确认差异的目标哈希由浏览器按同一 UTF-8 长度前缀规则重新计算，并与冻结票据一致才写库。独立固定向量在 C#／TypeScript 均断言，输出未由显示计划重建。首轮扩大事务夹具共享 after 与 before 数据导致失败，改成独立副本后通过。

初稿类型 `5509` 读到了修正前 openFile 的错误作用域并退出 2；当前源码差异已恢复正确组件作用域，打开真实成功后才关闭目录页，最新类型 `85260` 仍在执行（TEMP/pokerngkit-save-folder-ui-types2.log/.exit），不把旧结果写成当前通过。最新产品修订后尚需最终类型、完整核心／裁剪／工程与外部 Chrome。最后文档全仓格式 `42965` 已通过，本轮后续编辑必须再收格式。

修正类型 `85260` 已退出 0；刷新可靠性补充后目录页／库事务／协议／客户端四文件 103 项通过，末次页面 Lint `51185` 退出 0。持久化已提交时先更新页面快照并清除旧票据，Core 刷新失败仍可载入／撤销；页签状态和翻页一致使用已应用查询。核心／裁剪 `75453` 退出 0，继续同一默认完整原生；最终完整前端 `49016` 执行中，不重复启动。Chrome 仍无法读取外部标签，真实界面／IndexedDB 和所有者验收未完成，原 E.sav 哈希保持。相遇提交部署已成功，目录本批未提交。

最后失败恢复修订在读取新页前清空旧行／选择，避免错误后继续显示过期结果；Core 确认失败清除已消费／失效票据，存储失败保留冻结差异继续重试。定向 Lint 与四文件 103 项 `14267` 通过。完整 verify 已进入全仓 Lint，后续类型／测试／网页打包必须覆盖这些最后代码；完整原生仍原句柄运行，编译输入冻结。库存记录工程覆盖，未以专项或静态 markup 代替真实浏览器操作验收。

最终串行 `75453` 核心／property-trim／默认完整原生均退出 0；完整 verify `49016` 退出 0，296 文件／1397 项、类型、网页与 PWA 257 项（24730.22KiB）通过。99 个框架文件 public／dist 哈希一致，原 E.sav SHA-256 保持；文档末次全仓格式 `76462` 退出 0。最终类型／测试／打包已覆盖最后页面修订，既有 Hook／大 chunk 提示保留。游戏显示按当前语言，游戏列筛选与排序保留来源 GameVersion 枚举文本／数值语义。本批按已有授权普通提交推送；真实 Chrome 页面、IndexedDB 事务与所有者验收仍待核验，不据此宣称完整 PKHeX 目标完成。

## 传说 Z-A 甜甜圈窗口（API 132，工程检查通过）

已核对 PKHeX 26.08.26 `SAV_Donut9a.cs`、`DonutEditor9a.cs`／Designer、`DonutFlavorProfile9a.cs`、`SAV_DonutGenerator9a.cs`／Designer、`DonutPocket9a.cs`、`Epoch1900DateTimeValue.cs`、`DonutSpriteUtil.cs` 与 Misc Resources.resx。API 132 已接三语悬浮面板入口及 Worker 读取／单次预览／确认／取消／导出，工程检查通过，页面／真实存档尚未验收。

产品按概览／树果／效果／制作时间／批量生成／导入导出分组，999 个物理格位可搜索、前后切换；原图、树果图、效果图、原始数据与 Core 口味图齐备。字段以有序事件队列保留，草稿未应用时禁用格位切换和其他操作，可先预览或丢弃。预览逐格显示图像、全部数值／选择、两时间、口味图及前后完整 bytes；确认不重掷，取消／关闭释放缓存，焦点回到原动作。二进制文件与拖放均恰好 72 字节，十六进制文本导入和文件导出保留来源语义；网页用文本输入／下载对应桌面剪贴板内容，全部本地处理。

- 数据块 `BE007476` 为 Object，999 格，各 `0x48` 字节；缺失或不足长度禁用，不在生产创建块。毫秒 UInt64 位于 0，星数 byte `+8`、等级提升 byte `+9`、甜甜圈 UInt16 `+A`、热量 UInt16 `+C`、命名树果 UInt16 `+E`、八树果 `+10–1E`；三效果 UInt64 `+28／30／38`，保留 UInt64 `+40`。格位只开放 0–998；Core.GetDonut 的边界写法不能扩成第 1000 格。
- 星数 NumericUpDown 0–6，等级提升 0–255，热量 0–65535，载入按范围钳制；空／无效数字沿用控制值。SaveDonut 将 decimal 转 byte／ushort，不能凭五张星图改成上限 5。甜甜圈选项来自三语 donutName 全表；九个树果选择为 None 加 ItemStorage9ZA.Berry；三效果选项为 None 加 DonutInfo.Flavors 的原顺序，存储 FNV64 哈希，网页使用字符串，不能用 Number。未知旧选项在显式原版保存时归零，读取原始字节保留。18 项逻辑输入以有序事件列表应用，允许日期／毫秒重复变化；最多 512 项是浏览器资源限额，不是上游控件限制。
- 口味只统计八个实际树果，命名树果不参与。五项为辣／鲜／甜／苦／酸；数值与独立缩放全部由 Core.RecalculateDonutFlavors／GetStatScale 提供。图形顶点顺序为辣／酸／鲜／苦／甜，使用源的零值 10% 基线。图像选型按 DonutSpriteUtil：普通 ID 取余六口味加星数，198–202 使用五张专属图；未知资源不造图。
- 日期块 `+20..28` 为 Epoch1900 位编码，含秒 byte `+24`，剩余三字节保留。日期控件默认最小 1753-01-01，最大 4095-12-31 00:00；无日期载入本地 Epoch=1970-01-01，超控件范围回到 Epoch，但实际无效年月日／时钟会在进入控件前抛出，不能静默归零。毫秒 TextBox 默认最大 32767 字符，ulong.TryParse 使用 Integer；无效文本不改日期，保存毫秒归零。日期变化保留旧毫秒 `%1000`；毫秒变化同步日期，超过日期范围时源回到当前本地时间，浏览器必须传明确墙钟时间。日期不作 UTC 转换；不得用 Date.now 直接代替原版 `DateTime.Now - 本地 Epoch`。
- Reset 先清整个 72 字节，再载入／保存控件，因此最终日期编码为 1970-01-01，不能宣称最终记录全零。Clone 先保存当前格，再复制整条记录到全部 999 格。文件导入恰好 72 字节；剪贴板 Trim 后只移除 ASCII 空格，并调用源 Util.GetBytesFromHexString。该 API 忽略返回状态，可写入有效前缀、保留后续旧字节；空／无效后缀不是强制清空整格。导入和导出按源 SaveDonut 规范化，原件不修改。
- 全部三级、异色模板及自选生成直接调用 Core。自选范围 start 0–998／end 0–999，结束不含，必须 start<end 且至少一项效果。候选严格沿源 `name.AsSpan(6,2)` 数字 3–21 的筛选，不自行扩大成所有口味；每格最多三种唯一选择，不足三种补零。生成前保存当前格，可能带来范围外的当前格规范化，须在预览显示。一次预览只生成一次，Worker 会话缓存完整输出与源／目标哈希；确认仅提交缓存，不再次随机。旧令牌、重复确认、过期源、替换、取消与失败预览均受校验。

385 张未修改本地资源共 1847336 bytes，含源 GetItemSpriteA 使用的全部 66 张树果 Artwork。脚本 `scripts/import-pkhex-donut-art.mjs`、资源键／源路径／SHA-256 使用既有 artwork manifest；归属见 UPSTREAM，不改 vendored Core 或引入 CDN。三个 ZA 类型化修订专项已通过，覆盖独立完整文件字节对照、时间与空值、前缀导入、999 格克隆、范围外当前格、冻结随机、失败清理和异常日期。API 132 三文件前端领域／资源／客户端专项共 44 项通过，完整原生、核心发布与裁剪后 26 类属性通过。完整 npm run verify 通过：263 文件／1118 项、格式、Lint、类型、网页与 PWA 252 项预缓存。Lint 的导入脚本 URL 与多余正则转义均已修正，保留既有 Hook、反射裁剪和包大小警告。界面增加变化格位搜索，效果图片跟随草稿选择。生产 SaveUtil 识别未放宽；外部 Chrome 仍连接失败，页面及真实存档待验收。

## Z-A 事件窗口（API 133，工程检查通过）

已读取只读来源 `SAV_FlagWork9a.cs`、`EventWorkGrid64.cs`、Core `SaveBlockAccessor9ZA.cs`／`EventWorkStorage64.cs`。原版包含 Flags、Event、Work、Quest、WorkMable、CountMable、CountTitle、Report、WorkSpawn、InfiniteRank、Spawner2、Spawner4、Obstruction、FieldItems、FieldObjectInteractable 共 15 组；Load 读取全部物理 Count，保存逐行写入并 Compress，不只显示 CountUsed 或擅自 Sort。

64 位值与所有键须以字符串传输，不能使用 JavaScript Number。Report／Spawner2／Obstruction 的第二键按 Int64 显示、转换回 UInt64 位模式；Spawner4 为双名称／哈希键，FieldObjectInteractable 为三键。名称解析先查自定义表，再按十六进制解析，最后 FNV1a64；仅 64 位单键 Save 会 Trim 名称，其余不 Trim。加载可选本地 key-list 文件以浏览器文件选择替代桌面固定路径。双文件研究原版仅比较 9 组；专项已确认其删除循环读取 updated.GetKey 而非 previous.GetKey 导致遗漏或越界，保留源报告并额外提供完整逐槽及块对照。

API 133 已接三语悬浮工作区、JSExport 和五种 Worker 读取／预览／确认／取消／比较请求。初稿核心、最终扩大及 API 133 三个修订类型化合成专项通过；六项领域与三文件 45 项接线专项、新增文件 Lint 和最终类型通过。完整原生与完整 verify 已通过，前端 264 文件／1125 项；最新核心发布、裁剪后 26 类属性检查和最新资源网页打包通过，网页／PWA 253 项预缓存。保留既有 Hook、反射裁剪和构建提示。生产 SaveUtil 识别未放宽，不构成页面／真实存档验收。

界面显示 15 组与全部物理槽计数，Core 分页名称搜索及物理编号跳转；键和值按来源文本输入、跨页草稿保留，名称表切换在有草稿时禁用。整窗保存先冻结预览，按页核对全部行与所有变化块的元数据／bytes；取消和关闭释放令牌、恢复动作焦点。名称表提供文件／文本输入，双存档比较提供文件选择／拖放后的旧新分配、完整三语对照、原版原文报告和完整 JSON 下载。比较文件范围 1 byte–32 MiB，不复用旧事件 1 MiB 限额。控件 44px、标签 15px、正文 14px、说明 13px，表格为主要内部滚动区。

| 数据组                                          | 块键                                   | 每条布局                                                 |
| ----------------------------------------------- | -------------------------------------- | -------------------------------------------------------- |
| Flags／Event                                    | ED6F46E7／58505C5E                     | UInt64 键、UInt64 布尔值，共 16 字节                     |
| Work／Quest／WorkMable                          | FADA7742／B9B223B9／03913534           | UInt64 键、UInt64 值，共 16 字节                         |
| CountMable／CountTitle／WorkSpawn／InfiniteRank | 8D80EC0F／2C2C6964／53FD0223／7C896A83 | UInt64 键、UInt64 值，共 16 字节                         |
| Report／Spawner2／Obstruction                   | AF2165F0／79ABCB0B／4C26C29B           | UInt64 名称键、Int64 显示的第二键、UInt64 值，共 24 字节 |
| Spawner4                                        | D1A3FF7B                               | 两个 UInt64 名称键、UInt64 值，共 24 字节                |
| FieldItems                                      | 2482AD60                               | UInt64 键、UInt64 布尔值，共 16 字节                     |
| FieldObjectInteractable                         | 7147C953                               | 三个 UInt64 名称键、UInt64 值，共 32 字节                |

物理 Count 按实际块长度除条目长度，不从注释猜测修订版数量；完整读取包含首个空键之后的记录，尾部不足一条的 bytes 保留。键和值使用整个 CLR UInt64 范围；第二键数字按整个 Int64 范围显示，再以同一位模式写回。布尔加载为非零 true，整窗保存会将全部非零值写成 1。数值输入在 ValidateCell／ValidateU64／ValidateValue 失败时恢复源存档加载值，不能改成零或只跳过整行。原版 Save 再解析行并调用 Core.Compress，按原顺序移动非空行、清除移动源，不调用 Sort，也不把所有空行残留值预先清零。

实际 .NET 10 WinForms 控件探针（27931）确认名称与数值 DataGridViewTextBoxColumn.MaxInputLength、搜索 TextBox.MaxLength 均为 32767；控件源在 EventWorkGrid64.cs。搜索只查名称键，OrdinalIgnoreCase，不搜索数值或编号；tuple 仅查 Key A，hash2／hash3 查所有名称键。浏览器读取增加 1–200 条分页传输、默认 50 条，过滤仍由 Core 执行，物理槽数与完整保存范围不减少；分页专项已通过。

自定义名称表调用原版 SCBlockMetadata.AddExtraKeyNames64：按 TAB 分开十六进制键／名称，无法解析行跳过，同键第一项保留；空 FNV 键预留空名称，不覆写；反向表同名称重复时拒绝，与原版 EventWorkLookup 一致。4 Mi 字符名称表、8 Mi 字符读／写请求、50 Mi 字符双文件请求及最多 200 条单页为浏览器资源限制。预览先清旧缓存，完整解析后写入克隆；记录全部变化块的元数据／bytes、全部逐槽差异与完整文件哈希。确认只提交缓存一次，取消、替换、失败与过期保护原件。

独立专项已确认原版九组报告的删除循环会遗漏删除；两份块数量不同还可能越界。保留原版报告及错误信息，同时独立提供 15 组完整物理槽 raw 对照，包含未列入原版报告的复合键、孔洞和布尔原始编码变化；不会把原版无报告理解为完整文件无差异。

扩大专项还覆盖元数据独立变化、尾部不足一条记录的 bytes、部分键编辑与失败 Open 清旧令牌。比较同时列出 15 组块的类型／子类型／完整 bytes，不能只查完整行；保存保留尾部残留。请求未改的键以 null 保留，允许编辑一个键时其他键的预载长名称保持原值，32767 输入限制只约束实际新输入。

## 技式记录（API149 工程通过，页面待核验）

完整verify99973退出码0：283文件／1294项前端测试、生产构建和PWA257项通过；核心99文件、类型图19张的public／dist哈希一致。默认完整原生42124退出码0，五实体／七动作专项也包含在总链中。核心、裁剪、类型、lint和最后格式均通过；页面与真实存档仍待核验。

## 强化招式记录（API150 工程通过，页面待核验）

真实绿宝石可选烟测20786已通过（退出码0）：公开识别SAV3E/E、14箱／20只箱内／5队伍；只在内存副本改亲密度后导出回读，长度／格式／校验及其他格位／队伍保持，输入与本机源文件字节均未变。此检查验证旧世代通用文件流程，不作为Z-A强化招式实档证据。样本未入库，Chrome网页仍待连接核验。

已提交推送 `672235b`，Actions38340554724已成功。所有者确认的真实绿宝石存档使用可选 `PKHEX_TEST_FOCUS=real-save`／`PKHEX_REAL_SAVE_PATH` 检查，结果见上文；样本不入库。Chrome重启后登记id4，但标签列表和直接本地URL读取仍fetch失败，未取得页面上下文；原生证据不能代替网页或所有者验收。

已核对上游PlusRecordEditor／Designer、父PKMEditor入口、IPlusRecord／IPermitPlus、PlusRecordApplicator、PA9、PersonalInfo9ZA及等级资源。仅PA9／SAV9ZA适用。目录340项、使用340位、总容量360位，逻辑编号000..339；原始记录为0xD6起33字节／264位加0x94起12字节／96位，索引264进入第二段，尾20位不创造可见招式。手动保存保留尾位，Core建议及清理遍历360位。

七操作保留窗口与父入口差异：保存全部草稿行；Give All先保存再调用默认LegalCurrent、Control的LegalCurrentTM、Shift的LegalSeedTM或Alt的None；Remove All和父HasFlag(Shift)直接操作原数据，不保存子窗口草稿。窗口没有ForceAll命令。当前招式／LearnPossible仅提示，所有记录可手动修改；属性按类型、当前或可学、名称排序。

等级资源按BinLinkerAccessor16与LearnsetReader整除布局只读核对：两表1445目录／594非空／8030招式等级对，全在340候选中；强化等级6–100、普通0–99，各326项一字节00尾部由Core忽略。强化表404处相邻等级下降，普通表无下降；例如Personal索引1前三招33／45／22对应10／10／6。Core按原序遇到超过Evo.LevelMax即停止，正式建议直接调用Core，不排序补齐。Rotom／Hoopa形态、Alpha与TM沿用Core进化／遭遇规则。

来源审计92927、35种族形态等级组合的实体专项61565、完整文件专项64342以及公开JSON专项3950均退出码0。覆盖全部物理／可见位、264分区、七操作完整实体／文件Core对照、尾位／技式隔离、三语提示、四单只表示、队伍／箱子、目标六字段、冻结单次／过期／替换／针对取消／失败清理和原件。合成类型路径不代表生产SaveUtil识别或真实存档验收。

API150四个JSExport、required JSON和八种Worker请求已接；前端三文件86项、最终类型81934、定向lint75820、核心29896、property-trim及全仓格式均通过。SAV9ZA存档详情与PA9独立详情共用PlusRecordEditor、现有Select／按钮／MoveShop列表样式，44px目标／控件、15px控件文字和14px列表，不新增皮肤。340行、属性图标、尾位提醒、逐项／原始／列表外位冻结差异、确认取消及既有副本／撤销齐备。语言变化保留草稿，关闭或换目标针对取消。

完整verify40310退出码0：284文件／1304项测试、生产构建与PWA257项通过，核心99文件和19类型图的public／dist哈希一致。默认完整原生46795退出码0；页面与真实存档仍待核验。本批准备提交，完整PKHeX目标仍有其他窗口和平台等效功能未完成。

## 超级训练（API151，工程检查通过，页面待核验）

第六／七世代存档宝可梦详情及 PK6／PK7 独立文件详情共用 `PokemonSuperTrainingEditor`；ORAS Demo 仅开放真实队伍。复用共享 Select、按钮、表单与列表样式，保持 44px 控件和目标。普通／配信分组、PK6 沙袋／命中／秘密／完成、原始值与草稿、冻结差异、确认取消及既有工作副本／撤销已接；切换语言保留草稿，关闭或换目标只取消当前预览。

来源为 `SuperTrainingEditor.cs`／Designer、父 PKMEditor 入口、`ISuperTrainRegimen`／`ISuperTrain` 与 PK6／PK7。30 个普通项物理位序为 3,4,7,2,5,6,9,10,13,8,11,12,15,16,19,14,17,18,20..31，位于 0x2C 四字节；6 个配信项位于 0x3A UInt16 的低六位；秘密／完成位于 0x72 低两位。普通低两位与状态高六位保留；源配信 Setter 转 byte 回写，会清除高八位，预览明确显示此变化。

PK6 沙袋编号位于 0x17，目录 27 项，超目录旧值开窗归零；0x16 命中数为十进制 0–255。非 PK6 隐藏沙袋、秘密和完成，但保存仍按旧状态与隐藏草稿做 AND。PK6 锁定时开窗清普通第 4–8 阶及完成；关闭秘密执行同样清理，不清配信。Give All 先按操作前秘密状态决定配信，再为 PK6 解锁、完成并勾普通，因此未解锁时第一次 All 不勾配信，第二次才勾；Remove All 清全部旗与两状态。操作用有序事件保存，512 项上限是浏览器资源限制。该窗口与存档训练记录、通用极限训练分别接入。

45 个具名三语控件标签来自 WinForms `lang_zh-Hans.txt`／`lang_en.txt`／`lang_ja.txt`，不能按 Core 的 38 行训练场资源替代。`scripts/import-pkhex-supertraining.mjs` 同步生成 C# 与前端标签，来源哈希见 `third_party/pkhex/supertraining-sources.json`，未改上游 Core。

四个公开 JSExport、required JSON 与八种 Worker 请求已接。目录区分 Stored 原始值与 Draft 开窗值，冻结预览比较实际存储行、标量、原始位及完整文件；来源／输出哈希与六个目标字段绑定。一次确认、过期、替换、针对取消、失败清旧票均有校验。存档写入限定 SAV6XY／AO／AODemo／7SM／7USUM，不放宽通用格式识别或编辑许可；回写检查完整载荷、格式、长度、校验和队伍数。

来源专项 49009、扩大实体专项 11247、修正后的完整文件专项 43503 与公开 API 专项 85956 均退出码 0；覆盖两格式八种单只表示、五种存档类型、全部可见位、所有沙袋／命中 byte、有序操作、独立完整字节对照与原件保护。首轮不可导出 BlankSave 夹具被生产保护拒绝，修正测试夹具后通过，未降低生产限制。三文件前端专项 96 项、最后类型、定向 lint 修复、核心构建和 property-trim 已通过；完整 verify 修复导入脚本的 Node URL 显式导入后退出码 0：285 文件／1316 项测试、生产构建与 PWA 257 项通过；99 核心文件与 19 类型图的 public／dist 哈希一致。默认完整原生 40245 已退出码 0，最后全仓格式与差异检查通过。合成类型路径不等于真实存档、浏览器或所有者验收。

## 通用文字字节窗口（API152，工程通过，页面待核验）

只读核对 PKHeX 26.08.26 `Subforms/PKM Editors/Text.cs`／Designer 与父 PKMEditor 的 Control 点击入口。昵称、初训家姓名和现任训练家姓名在打开前先写入当前文本，再取得对应 Trash Span；输入长度来自实体 `MaxStringLengthNickname`／`MaxStringLengthTrainer`，不能套用 Designer 的 12 字默认值。无字节缓冲的字段只有文字／特殊字符路径，不创造不存在的现任训练家记录。

字节控件为十六进制 0–255，Shift 填 255、Alt 填 0；手改一字节由当前实体 Converter 回读文字。文字变化以 `StringConverterOption.None` 编码，仅复制实际写入长度，保留后续尾部。物种层使用未过滤的 SpeciesDataSource，语言按初始实体世代／Context 绑定；选择世代只用于 SpeciesName，编码仍使用当前实体。清尾从当前编码长度开始，层被当前文本遮住或超缓冲时拒绝。世代控件没有显式范围设置；本机 WinForms 默认控件探针确认十进制整数 0–100。

源 `Raw` 与 `FinalBytes` 共享数组，取消按钮仅 Close，Show 无条件复制 FinalBytes；取消后的文字仍为初始 FinalString，已改字节仍可能被复制，不能直接假设原窗口取消等于丢弃全部字节。特殊字符为 Gen5 的 0x2460..2484（跳过 2469..246B）、Gen6／7／7b 的 0xE081..E0A5（跳过 E08A..E08C）以及 Switch Context 的 18 个 Unicode 字符。追加核对 PK7.SetString 忽略 option 并调用默认 ClearZero；源窗口使用临时缓冲且只复制返回前缀，不能直接在实体缓冲调用此转换器。首轮13429假定日文GB可往返英文A而失败，修复后56382发现直接编码会清PK7尾部；审计改为源临时缓冲／前缀复制路径，61486已退出码0，18种布局来源检查通过。现阶段保留可选 `text-trash-audit` 来源检查，覆盖 18 种实体布局的实际缓冲／上限、编码终止与尾部保护、源关闭行为和原件；内部 `PokemonTextTrash` 已加入文字／字符／逐字节／清尾／物种层的有序草稿，使用临时编码和逐个真实 ValueChanged 顺序，克隆实体写入；512事件是浏览器资源限额。18布局完整实体前缀／清尾对照与非法值拒绝首轮专项13360在BK4原件快照处失败；BK4.Clone补解密状态位，已改用原始字节快照，修正90025及扩大23300已退出码0。扩大覆盖每个物理byte的0／255／同值、全部特殊字符、初始语言×0／原世代／100名称层、同文本不触发TextChanged及513事件拒绝。内部TextTrashSession已加入来源／目标哈希与七字段绑定、完整文件冻结、单次确认／针对取消／过期替换／失败清理；18布局四文件表示的独立完整输出专项71694退出码0。13种已识别存档夹具新增箱子／队伍完整文件对照、其他格位／队伍和三姓名缓冲回读专项39135因测试引用不存在的AllPositions辅助方法而编译失败，已改为实际箱子／队伍枚举，修正84901通过前11格式，在LGPE空首格拒绝；测试副本补有效实体后61031退出码0。11格式覆盖箱子／队伍，GP／GE覆盖箱子。API152五JSExport、required JSON与十Worker请求已接，公开原生50053和前端三文件105项与定向lint通过；草稿解码继续由Core在Worker执行，前端不复制编码器。夹具属于合成工程证据，正式三语UI／新核心和完整工程尚未完成。

正式两入口共用 `TextTrashEditor`，位于宝可梦详情，按字段切换昵称／初训家／接手训练家。文字与特殊字符在前，byte／名称层折叠，差异在确认前。全部控件沿用共享44px基线，不新增皮肤；空byte恢复当前值，世代失焦约束0–100，Core提供初始世代和只读权限。草稿每次经Worker／Core有序求值，前端不实现编码器。源注释中的私有码位使用三语名称／Unicode符号作为选择标识，原始码位不替换；源字体仅找到家族元数据，未导入。折叠／退出／换目标取消冻结，迟到预览释放，取消后恢复预览按钮焦点。确认进入原有副本与撤销链。

最新前端三文件106项、定向UI lint修正后通过；首次类型76324缺单只操作枚举，已补齐，最后类型待运行。55056追加LGPE队伍时被通用party读取拒绝；来源SAV7b.HasParty=false，队伍由PokeListHeader箱子指针处理。专项已映射真实PC格位、跳过同物理别名并验证队伍看到相同姓名；共享队伍和锁定只读专项79718已退出码0，共享队伍与锁定只读检查通过。独立LGPE队伍导航仍需后续接入，不能把这项物理格位检查写成该导航已完成。API152浏览器核心／裁剪和完整工程、外部Chrome页面尚待完成。

API152核心20362、最后类型45657、property-trim及完整verify29431已退出码0。前端286文件／1330项、生产构建与PWA257项（24605.99KiB）通过；99核心文件与19属性图的public／dist哈希一致。默认完整原生22995已退出码0；Chrome页面／真实数据流程尚未验收。本批正在提交收尾。

## 本地宝可梦数据库（SAV_Database，API157开发批）

157最终门槛：默认完整原生35173退出0，包含数据库转换／准备、声明格式、三游戏存储卡与既有编辑模块；完整verify91800退出0，292文件1362项及生产Vite／PWA257项24684.24KiB通过。核心、真实E.sav和property-trim均通过，99个核心文件public／dist一致，原存档哈希保持。最后取消按钮归属复核后的定向Lint80533通过，末次文档格式完成后按已有授权普通提交推送。页面及浏览器存储流程未验收，不能把工程结果写成所有者接受。

157前端完整verify91800退出0：292文件1362项、Vite与PWA257项24684.24KiB通过，99核心文件public／dist一致，原E.sav哈希保持。嵌入编辑器的取消入口仅对应其自身任务，末次格式86259退出0。默认完整原生35173仍运行，未提交本批；收齐后再提交，不把先前API156门槛当作本批完整原生结果。

157当前门槛：串行35173的核心、真实E.sav和property-trim均已退出0，默认完整原生仍运行；完整verify91800已启动，日志`TEMP/pokerngkit-database-prepared-full.log/.exit`及`pokerngkit-database-prepared-verify.log/.exit`。只收现有句柄，不重复启动或修改原生输入。最终工程完成后再普通提交推送；当前未提交157。Chrome本轮标签读取仍fetch失败，未进行真实界面／存储检查，不以合成卡或原生检查代替页面验收。

2026-10-14转换／准备编辑：原版ClickView调用EntityConverter.ConvertToType、当前SAV.AdaptToSaveFile、RefreshChecksum，再PopulateFields。正式View入口沿相同Core调用，在独立实体与存档副本上转换，返回解密party文件；原数据库实体和源文件不修改。检索与准备编辑分视图，切换保留副本，复用现有StandalonePokemonPanel全部普通／高级编辑、合法性、原始数据、导出及撤销，不新建简化编辑器。准备后的副本可冻结预览加入数据库或导入当前存档；导入调用Core.LoadBoxes并使用箱子、覆盖、清空、图鉴与记录选项。

数据库文件和连续描述增加UseFileFormat，旧记录默认false，准备编辑文件为true，明确按其实际扩展名读取，避免用户改版本线索后启发式解成其他实体类型。该选择纳入文件确认哈希及IndexedDB比较替换；仅实体文件允许该标记。输入上限沿用现有1MiB实体、1024个来源／128MiB总量／64MiB单来源和1MiB请求文本，View目标仅为当前已加载行id。协议升157，全部Worker／前端声明和原生门槛同步，未替换其他数值156。

97972首个13存档准备专项及48179完整数据库矩阵退出码0：当前格式转换、精确加入文件、Core.LoadBoxes完整导入、声明格式回读及源缓冲保持；补充BR两个地区×两个分区×四个档案转换／过期拒绝也通过。首轮28758的测试枚举Unknown不存在，改源Any后通过。85702存储卡专项退出0，COLO／XD／RS Box单卡与三游戏混合卡、目录和分配控制块校验、实际占用箱位／独立所有权、坏主目录从备份恢复及原输入保持通过，明确为合成代表性卡，未作为真实卡或页面验收。93项前端协议／事务／客户端70525通过，声明格式传输和其他标签改变该字段的补充34190两文件8项通过；定向Lint18372／76109和类型35177退出0，后续视图布局已格式化，最终完整工程尚待收齐。

最终工程门槛：完整verify6461退出码0，292个测试文件／1362项、生产构建及PWA257项24680.43KiB通过；数据库错误／保存／撤销提示已补三语。串行76075核心重建、真实E.sav、property-trim及默认完整原生全部退出码0，首次verify13450亦通过，最后本地化修改后已完整重跑。保留既有Gen3Static一条Lint warning及大chunk提示，未扩大修改范围。99个核心文件及数据库壁纸在public／dist哈希一致。正式页面及浏览器IndexedDB仍待外部Chrome核验，不作为所有者验收。

2026-10-14：正式存档工作区增加独立数据库入口，复用共享Select／候选控件、44px控件与三语标签。来源文件／目录由用户选择并保存IndexedDB副本；目录类别显式选择宝可梦文件或存档。图像网格使用本地宝可梦PNG与上游`box_wp_clean`，六列桌面、三列窄屏，结果内部滚动；首次完整列表分页使用无格式限制条件，主动检索才使用所选条件。

选中项和全部检索结果可预览导入；单只删除、克隆清理及加入本地数据库使用冻结确认。确认先取得原生固定输出，再比较工作存档哈希并在单个IndexedDB事务内核对／替换文件副本；存储失败保留原工作存档和固定输出，支持重试。其他标签修改文件内容／名称／时间时拒绝覆盖。单步撤销恢复该步存档与文件集合；恢复原存档只恢复原存档内容，独立数据库副本保留。历史按20步／64MiB计入存档与独立文件缓冲，至少保留最近一步，浏览器崩溃跨两个存储层的恢复尚未实现，不能宣称跨页面事务持久化。

全部结果可ZIP导出及接现有报表的全部属性、显示设置、排序和CSV。每实体使用自身party宽度；ZIP文件名加入结果id并去除路径字符，重名不丢数据；报表按源规则排除超实体格式种类范围记录。结果导出／报表最多10000条、ZIP64MiB，属于浏览器资源上限。新增Query导入直接按完整检索集合解出id，调用Core.LoadBoxes，不保证每个跨游戏实体都可导入，实际导入数量由Core决定。

前端事务事件模型／协议／客户端三文件93项通过，含失败回滚、其他标签变化拒绝及调用者缓冲保持；设置专项2项通过，已修复默认值函数漏调用造成空设置，行数／排序／种类过滤保存localStorage。定向Lint修复导入脚本URL缺失与effect依赖后90979退出0。原生98976／7212错误预设报表数量；32445错误预设导入数量，28465／78826分别在复制序列化和GP随机转换的测试oracle失败。使用真实游戏Version区分实体格式及完整Core.LoadBoxes对照后19570退出0，13存档ZIP每实体字节／报表／CSV／Query导入完整输出与BR上下文通过，不修改生产转换或减少矩阵。串行76075已完成核心重建、实档及裁剪，默认完整原生仍运行；verify13450通过格式／Lint，类型阶段运行中。真实浏览器IndexedDB及页面未核验；Chrome识别id4但标签读取fetch失败，不使用IAB替代。存储卡代表性夹具、独立暂存实体进入完整宝可梦编辑器及转换View正式入口仍待补；完整接入目标继续。

2026-10-13公开接线阶段：Open／Read／Catalog／Preview／Commit／Export／Discard／Reset已公开JSExport并连接SaveEditorClient专用双缓冲入口与Worker，协议升156。加载／确认使用连续二进制文件段；确认仅返回当前存档、移除id及新增文件，不重复传回未变化文件集合。51443公开专项及91485完整候选／属性当前值补充退出码0，13存档全部字段／确认／原输入保持，BR两个地区×两个分区×四个档案的读取／上下文过期通过。当前存档复用SaveService.Open，BR选择纳入会话检查。

26956前端三文件90项及定向Lint通过，首轮4096MB类型63653退出0；后续数据库筛选组件66030最终类型退出码0。真实E.sav读取全部有效箱子／队伍／额外槽和单格冻结删除预览、已有编辑／导出回读及原输入保持通过，串行69588与API156核心构建退出码0；property-trim92992退出码0。DatabaseFilters普通条件／四招式／格式比较／只读属性构建器复用SearchCandidate和Select，沿用三語来源标签；日文原版缺失控件名补齐主动语言覆盖。仍未接主工作区图像网格、文件列表、确认持久化及报表／结果ZIP联动，不能作为完整数据库功能或页面验收。

下文内部阶段保留来源和失败历史，当前公开接线以上方API156记录为准。

会话阶段：PokemonDatabaseSession已接delete／import／add／clones四动作，预览绑定完整当前存档哈希与全部文件id／名称／内容／类别／修改时间，输出冻结一次性确认；过期、替换、取消及失败清理均拒绝旧票据。克隆清理调用Core HashDetails，独立文件按原修改时间降序保留首项，当前箱子调用BoxManipClearDuplicate；只删除本地数据库副本，原文件不写入或删除。73613会话专项退出码0，13存档全部动作／完整文件／较新文件保留与生命周期通过。首轮44233在测试记录初始化语法失败，修复后完整重跑通过。

二进制／JSON内部接线：PokemonDatabaseRuntime加载和确认使用独立二进制文件缓冲与连续offset／length描述，拒绝缺段、重叠、尾部额外数据、缺失required JSON与超1MiB元数据。首次展示加载后的完整Rows，只有主动Search才应用条件，与LoadDatabase.SetResults(RawDB)一致；不能首次强套存档格式条件。Source格式比较控件可见，Context／Comparison支持Core有效上下文与全部比较值，默认仍来自当前存档。8120专项通过13存档分页／typed PokemonEntry／全部输入缓冲／完整JSON确认；导出遵循Core实际识别格式，不能由文件扩展推定解析结果。前端databaseProtocol二进制打包保持调用者缓冲、确认绑定与源5..20行／默认9，12228两文件4项及Lint通过。

格式矩阵55625在空白SAV3E克隆时上游WriteSectors越界，改为已识别E合成存档后30030串行数据库全专项／既有pokemon-search回归退出码0，18格式未被过滤的补充19138退出码0，TEMP/pokerngkit-database-format-fix.log／.exit。尚未JSExport／Worker／图像UI或浏览器核心构建，API155保持，不能把内部JSON接线当公开功能完成。

文件阶段：PokemonDatabaseFiles在输入副本上读取用户选择的独立实体／存档／GameCube存储卡，逐文件报告识别结果，失败时回退该文件的全部槽；每个槽保留独立文件id，不用名称判断文件所有权。导出使用每只实体自身SIZE_PARTY，避免源窗口以当前存档SIZE_PARTY处理混合格式。View转换按源EntityConverter→AdaptToSaveFile→RefreshChecksum执行。独立文件支持Core GetExtensionsAll，DS显式扩展读取沿用既有解密修正；输入1024文件／合计128MiB、单文件64MiB是Web资源上限。存储卡读取尚缺代表性夹具，不据内部接线宣告兼容完成。

内部写入阶段：DeleteCurrent只允许当前SlotInfoBox，检查实体仍EqualsStored并复用StorageEditing锁定／删除；Import复制存档和全部输入实体后调用LoadBoxes，完整清空／覆盖与EntityImportSettings保持源行为。文件来源删除、克隆删除及冻结确认现已在上文内部会话接入，全部公开接线仍未实现。89637文件专项退出码0，13种存档识别／无效隔离／自身party宽度导出／转换与原件保持通过；写入专项8060在测试Memory<byte>比较编译失败，修正20190后发现Clone来源缓冲改写，最终处理与通过证据见下文5993。

最终内部专项5993退出码0：13存档来源筛选／加载／导出／转换、原始文件id、当前箱位删除／过期拒绝、四组导入选项的完整文件对照及输入字节保持。20190发现部分Gen1/2/3 Clone会序列化来源缓冲，Copy入口已保护原缓冲；99382与20866进一步定位BDSP缓存ForcePartyData将当前HP 0x8A由0改为18，现保留展示标准化前的实体快照作过期比较。展示和导出沿用Core能力值，未变化的真实槽不被误判，其他变化仍拒绝；属于明确Web修正。三组数据库检查已接默认原生门槛，当时尚无冻结确认；当前内部会话已补齐，公开API／Worker／图像UI仍未接，不作完整模块或所有者验收。

src/features/saveeditor/databaseRepository.ts已加入专用IndexedDB文件副本存储，使用单次事务替换、失败abort、显式文件／目录选择、独立id与原修改时间。2项输入边界专项及定向Lint通过，实际浏览器持久化／失败恢复仍待核验，尚未连接正式UI。文件专项55355首次Span及Convert命名编译失败已修复；58673／87547在第六世代转换完整字节对照失败，39718定位仅随机记忆感受A6及派生校验，oracle同类型转换返回原对象导致测试前值被修改。改为独立oracle克隆后89637退出码0，TEMP/pokerngkit-database-files-oracle.log／.exit；生产转换未因此放宽或改变。

来源已读WinForms SAV_Database／Designer相关入口和Core SearchSettings／SlotInfoLoader／EntityPresenceFilters／EntityDatabaseSettings。原版加载当前存档、数据库独立文件及其他／备份存档，先移除Species=0或Valid=false，再按当前Context在场规则过滤；初始排序可为None、SpeciesForm、SlotIdentity，之后才ForcePartyData。显示网格6列，行数设置默认9、Clamp 5..20，实际屏幕高度还会缩减显示行数。

搜索按来源开关预筛后调用SearchSettings.Search(SlotCache)，保留Slot元数据指令；仅合法／非法开关不同时设置SearchLegal。克隆筛选默认HashDetails，Control为HashPID，均在普通筛选之后执行。源删除单只数据库文件或未变化的当前箱位，拒绝备份／派对；删除克隆优先保留修改时间较新的文件，同时清当前箱子重复项。当前这些操作已有内部会话和对照，尚未公开接入产品，不能由只读搜索推定公开功能完成。

Web目录来源须由用户明确选择，本地副本持久化不扫描任意磁盘或自动访问备份目录。内部PokemonDatabase复制当前存档与外部实体，保留来源身份、实际SlotCache、初始排序和搜索结果id；首批只有构造／Search；文件与内部写入已在上文增加，公开API／Worker／数据库UI与报表联动尚未接入，API155保持。原生专项7587在GP夹具缺少Valid实体时测试选样失败；新增独立有效外部实体，不改生产有效性筛选，99719修复专项退出码0，13存档三类来源／初始排序／全部合法性克隆来源组合及完整存档／实体字节保持通过，日志TEMP/pokerngkit-database-native-fix.log／.exit；来源矩阵及文件／内部写入对照现已收齐，下一步完成冻结确认与文件来源编辑生命周期。

## 箱子数据报表（ReportGrid，API155）

来源已核对WinForms Main.MainMenuBoxReport、ReportGrid／Designer、EntitySummaryImage、PropertyComparer与SortableBindingList，Core为EntitySummary、SlotInfoLoader、SlotCache、BatchPropertyProvider及ReportGridSettings。Main使用ICollection版AddFromSaveFile：箱子→队伍→GetExtraSlots(true)，不是仅箱子；报告排除Species=0或超过实体MaxSpeciesID的行，刷新Stat_Level=CurrentLevel只在独立实体副本内执行。摘要全部公开属性与Sprite列使用源顺序，来源位置保留真实物理槽，额外槽不能误当箱子槽用于通用编辑。

源ExtraProperties／HiddenProperties默认空，没有数值输入控件；缺失或null额外属性不生成列，重复有效属性保留。先隐藏已有列、后添加额外列，恢复显示会恢复全部列。Sprite禁止排序，摘要字段按属性原类型Comparer<T>.Default排序；额外列按文本排序。RemoveSort清排序状态但不自动恢复初始行序。Web当前属性列表256项、每项128字符是独立资源限制，不是源设置上限。

原版关闭时询问导出CSV，Shift关闭跳过；UTF-8无BOM、文件名Box Data Dump.csv，跳过Sprite，包含隐藏列。原版仅包裹双引号但不转义字段中的双引号，Web计划正确转义并明确这一修正。复制源包含表头，普通剪贴板为制表符文本，可按原版规则转Markdown表格。报表值来自Core EntitySummary，三语地点直接使用对应GameStrings，避免改动全局GameInfo语言。

内部PokemonReport已加入，可选pokemon-report专项首轮82126因局部模式变量重名编译失败；修复55277退出码0，13种合成存档全部摘要字段／三语／全部原类型升降序／额外隐藏属性／CSV引用和源完整字节保持通过。补真实箱子／队伍／额外槽位置、图像及空表Sprite排序拒绝40289退出码0，TEMP/pokerngkit-report-positions.log／.exit。已接默认原生门槛。当前API155公开目录／读取／CSV、Worker及存档分组入口已接，三语列名、共享可搜索候选、列显示恢复、原类型排序／重复列索引、单元格矩形选择及复制／CSV齐备；Span额外属性显示类型名，避免原版反射不可装箱导致报表失败，属于明确Web修正。公开13存档API专项40393、原类型显式比较98175及18实体全部额外属性87745通过；真实E.sav29096、92项定向前端与Lint通过。首轮类型32708因client参数／Select签名失败，修复25378退出码0。核心50128、完整verify72520及裁剪／默认完整原生89767退出码0；289文件1351项、PWA257项24644.90KiB，99核心文件public／dist哈希一致，裁剪后EntitySummary全部85属性签名及访问器保持。源存档SHA-256未变，网页与所有者验收仍待外部Chrome恢复连接。

## 宝可梦箱子检索（EntitySearchSetup，API154）

当前工程记录：最终完整 `npm run verify`（55427）退出码0，288个文件／1346项测试、ESLint、TypeScript、Vite及PWA257项预缓存（24633.06KiB）通过；ESLint保留1条既有Gen3Static Hook warning。最新Core重建41724、六文件147项前端专项56282与最终候选Lint88911通过，99个核心文件public／dist SHA-256一致。真实E.sav／property-trim／默认完整原生串行26013已全部退出码0，源存档SHA-256保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442；浏览器本轮仍在Chrome标签列表请求时报fetch失败，页面／Worker与所有者验收未完成。

空候选复核：WinFormsUtil.GetIndex返回SelectedValue或0，清空特性／性格／持有物／觉醒力量按0筛选，不等于Any；种类／招式0忽略，来源版本0忽略。共享候选保留空或未匹配文本，完整名称匹配不区分大小写，语言切换保留空状态；属性构建器初始选源首项，清空后无选中且禁止追加错误指令。旧14088前端通过结果与主动停止的66180属于更正前快照，不替代最终工程门槛。
正式只读目录／检索／定位三接口已连接Worker与箱子工作区。三语普通筛选、只读指令构建器、共享可搜索候选及来源排序、三态、互斥世代／来源版本、重置与前后定位齐备。匹配状态只淡化不匹配图像，单箱／双箱／全览保持所有真实格位及原编号；定位显示对应箱并聚焦该格。展开读取候选，折叠保留筛选；工作副本版本变化重新计算匹配，迟到结果不能更新新版本。构建器的“当前值”来自选中工作副本实体，切换选择后需重读，不包含各编辑表单尚未应用的草稿，此行为按Web的应用边界记录，页面仍待核验。

目录JSON上限4096字符，检索／定位JSON上限256Ki字符、指令32767字符为浏览器资源约束；源等级／ESV分别三／四位，空或解析失败仍交Core处理。查询位置须在真实箱位／队伍内，定位只限箱子；缺失字段、null文本、超出UInt16种类和错误位置均拒绝。每次读取复制输入，搜索无导出或编辑动作，完整原文件字节保持。

来源对照：API154专项59162、隐藏Context修正86712及候选排序28876退出码0。覆盖13种公开JSON存档全部候选／匹配位置、源码筛选与前后环绕、错误请求拒绝、完整输入保持，以及18实体／6个隐藏Context跨格式矩阵。最终空候选与版本0修正由41724专项和上方最终工程检查覆盖。

下文内部阶段为来源与失败历史，不代表当前API仍未接线。

候选／构建器内部阶段：PokemonSearchCatalogReader使用三份GameDataSource／FilteredGameDataSource，种类只排除0且不按当前存档限代、特性完整、道具按存档HeldItems、招式Skip(1)、来源版本只移除最后空项、觉醒力量使用HiddenPowerTypes索引。全部候选保留来源顺序及重复编号；首轮19732因重复571的字典转换失败，改为按编号与出现次数匹配三语名称，54348修复通过。构建器枚举EntityBatchEditor全部Any／实体格式／All属性表，显示源属性类型与当前实体属性值；Span只显示类型、缺失属性为空、null为文字null。Readonly源码只隐藏第0个“.”前缀，其余运算前缀仍显示，追加后CreateSearchPredicate只执行筛选，不能以“只读”名义误执行运算。

补充77461通过18实体的每个属性值／Span／空值和13存档每项三语候选／重复次数／全部格式表对照；原存档与实体完整字节保持。前端37470为3项状态／构建器追加边界检查，40340定向lint通过。生成器scripts/import-pkhex-search-labels.mjs从上游导入27个EntitySearchSetup三语具名标签，来源及SHA-256见third_party/pkhex/search-sources.json。当时尚未接公开目录API／Worker／正式控件，API153保持；该内部阶段已由API154正式接线替代。

来源为WinForms EntitySearchSetup、EntitySearchControl／Designer、EntityInstructionBuilder与SAVEditor／BoxEditor；Core为PKM/Searching/SearchSettings、SearchUtil、SearchComparison及StringInstruction。全部普通筛选调用CreateSearchPredicate，不在JavaScript重写筛选规则。复查Designer确认FLP_Format嵌套格式与比较控件，首次OnShown只重置TLP_Filters直属ComboBox，不会清隐藏格式条件；InitializeSelections的事件将格式设为当前存档Context，Gen8及之后比较Equals，之前LessThanEquals，ResetFilters也不清该隐藏限制。前一内部阶段误判其为无格式限制，现已纠正并增加跨18实体对照。来源版本与世代互斥选项需要在正式UI保留；重置清普通条件及指令、恢复三态异色／蛋为Any，隐藏ESV并重置前后定位。

等级MaskedTextBox为三位十进制，byte.TryParse失败或空白则null，成功0也不筛选；允许源可表达的0..255，不能套实体等级1..100。ESV为四位十进制，int.TryParse；仅蛋选择非Any时传值，false筛选非蛋时该值不会使用。四个招式去重且0忽略；昵称Trim后OrdinalIgnoreCase包含。IV七选项、EV五选项、比较四选项及世代0..9来自Designer列表，性格Random为25。高级文本只GetFilters，修改行忽略，元数据过滤从predicate中移走，与源窗口相同；不能误套批量修改的ScreenStrings。昵称RenderedString未设置MaxLength，继承TextBox；本机WinForms探针确认TextBox默认32767、RichTextBox默认2147483647。内部32767指令长度是独立浏览器资源上限，不是源RichTextBox上限。

箱子遍历只收非空实体真实格位，派对不参与。前后定位调用SearchUtil.TrySeekNext：首次当前位置(CurrentBox,-1)，逆向首次仍从该箱0格开始；后续从上次匹配之后／之前循环，空格跳过，未找到不改当前位置。内部PokemonSearch已增加Settings／Read／Seek与实体、13合成存档来源对照，专项12397退出码0；补充SK2及版本UInt8溢出拒绝18950退出码0，实体格式共18种。该内部阶段尚未接候选目录、属性构建器或产品入口，API153；现已接入API154，历史专项不单独作为浏览器验收。

## 信息列表（KChart，API153）

最终工程记录：默认完整原生修复70467、完整verify17993、核心40286、类型39903、专项／真实E.sav／property-trim47130及末次格式71382均退出码0。前端287文件1337项，PWA257项24614.67KiB，99核心文件与19宽属性图public／dist哈希一致。首次完整原生90532仅因四处旧协议断言失败，修复后从头完整重跑通过；生产读取逻辑没有因此降低校验。正式页面和浏览器Worker仍待外部Chrome连接核验，不作所有者验收。

完整前端工程17993退出码0：287文件1337项、TypeScript、Vite及PWA257项（24614.67KiB）；99核心文件与19宽属性图public／dist哈希一致。默认完整原生首次90532因四处旧API152测试断言失败，更新153后70467重跑仍在运行。网页／浏览器Worker与所有者验收尚未完成，不能用上述工程结果代替。

收尾专项47130退出码0：25种存档构造、13个明确合成存档公开JSON全部字段与完整输入保持、所有者授权绿宝石E.sav只读目录和既有编辑／导出回读烟测、最新property-trim。源文件SHA-256未变化。浏览器核心40286、扩大堆类型39903与全仓格式已通过；完整verify和默认全原生仍运行，外部Chrome标签读取失败，网页实际行为与所有者验收未完成。

当前开发批：API153新增ReadPersonalChart与Worker personalChart，工作区“宝可梦与道具”增加信息列表入口。表格只读，名称／编号／属性／特性搜索、表头排序、共享Select及左右按钮调整列序、重读和异步过期结果保护。当前存档变化重新读取，不修改存档副本或撤销历史；17源列完整保留，Z-A追加头目招式。宽属性图本地导入，统计颜色在C#计算，React只显示。公开API读取合成存档及未修改ColorUtil全条目对照已加入检查，正式浏览器和所有者验收未完成。

新增搜索没有源数值输入约束；它仅筛选已读取行，不参与Core参数。列顺序仅允许现有17／18列在范围内移动，不能构造或编辑种类；种类ushort1..Personal.MaxSpeciesID、形态byte0..<FormCount且IsPresentInGame，来源为KChart构造器／PopEntry。数值单元格为只读源值，按三位十进制显示；编号按MaxSpeciesID三／四位并追加非零形态两位后缀。原生检查首轮编译遇到测试模式变量重名，修复94428退出码0；定向前端5文件137项、资源哈希3项与修复后lint通过。核心构建、最终类型、完整工程门槛及页面仍待收齐。

只读核对 WinForms `KChart.cs`／Designer、三语 KChart 资源与 Drawing `ColorUtil.cs`。使用当前存档 `Personal`，种类从1到表的MaxSpeciesID，形态按该种类FormCount遍历，仅保留IsPresentInGame；不能直接显示全局种类表。编号按存档MaxSpeciesID选择三／四位，非零形态追加两位后缀，按编号字符串排序。形态名称来自当前Context的FormConverter，缺失索引用数字回落。

列为编号、图像、名称、原生标记、BST、捕获率、两属性、HP／ATK／DEF／SPA／SPD／SPE与三特性；Z-A增加头目招式。相同属性的第二列为空，缺少特性槽使用名称索引0。原生标记分别用Gen7的IsPastGenNative、SWSH／BDSP／SV的IsInDex、LA的IsPresentInGame、Z-A的IsLumioseNative，其余为true。源允许列顺序调整，全部单元格只读。

单项颜色为0–180比例，BST先减175、下限0，再除3并转整数；ColorUtil采用红／黄／绿与白色混合，颜色仅提示，不能替代实际数值。三语资源具名列标签已定位。生产读取、Worker与正式入口已接；颜色与编号／图像的全条目源对照已加入原生专项。

2026-10-13新增内部只读PersonalChart：当前存档个人表、三语形态名称、源SpriteName、原生规则、能力值颜色及Z-A头目招式。第一／二世代属性原始编号通过Core MoveTypeExtensions.GetMoveTypeGeneration转换后再取名称／图标编号，不能直接使用现代属性索引。可选personal-chart检查覆盖25种存档构造、全部在场种类／形态、原存档与共享个人表完整字节。首轮失败源于上游Colosseum空白构造器，已改用合法大小的解密缓冲夹具；修复90347退出码0。该内部阶段记录已由API153正式接线和94428全部对照结果推进；完整浏览器与所有者验收仍未完成。

## 技式记录来源与内部阶段记录

历史来源初审（后续已实现，最终状态见本节工程证据）：窗口／Designer、父PKMEditor的普通／Shift入口、ITechRecord及TechnicalRecordApplicator、五种实体记录与Personal许可已核对。显示全RecordPermitIndexes，不许可项可手动勾选；许可提示包含当前种族、进化链和当前招式。Save按显示编号写全部旗；Give All先Save，再按Alt清空／Shift强制全部／Control当前合法／默认全部合法调用Core，Core先清RecordCountTotal。Remove All不保存窗口草稿；父Shift只建议当前合法记录，不保存子窗口草稿。

来源范围区别：PK8／PB8使用100候选、112总位（G8PKM `0x127` 起14字节）；PA8候选61、总位64，但独立MoveRecordFlags在 `0x13F` 起14字节，不能误接招式商店的购买／掌握缓冲。PK9候选230、PA9候选160，二者RecordCountUsed均230、RecordCountTotal均304，均有 `0x12F` 起25字节基础200位与 `0x4B` 起13字节DLC104位，索引200开始进入DLC区。手动窗口只写候选编号，Core清理按总位数遍历，不能套用招式商店“保留尾部三位”的操作规则。TechnicalRecordApplicator的进化链分支只处理PK8／PK9／PA9，PB8许可全部false，不能给PB8／PA8另造合法推断。Z-A窗口以1基显示，但Load／Save直接把显示编号传入Core，而Core批量使用0基；这是实际来源差异，后续必须以独立完整字节对照验证，不能根据注释静默统一。该段保留初审阶段事实，正式接入已完成工程检查。

2026-10-13 专项首轮在PA9候选数断言处失败；修正审计91722退出码0，五实体候选／批量范围／总容量、独立物理地址、全清／ForceAll边界、LA高48位与商店缓冲隔离、原件保护通过。实际ZA MachineMoves只有160项，RecordCountUsed仍230、RecordCountTotal为304，不能创造70条不存在的招式名称。已复现Z-A窗口首尾读取物理1..160，Core候选对应0..159；勾选首项时原窗口使0x12F首字节为02，Core逻辑首项为01。

正式接入采用Core逻辑位索引0..159与显示编号001..160分离，修复来源窗口误用显示编号的偏移，保留原版Core批量操作的230／304范围。此为已有字节证据支持的UI映射修正，不修改只读上游源码；实际游戏存档仍需页面核验。下列记录分别保留内部阶段与当前API149接线证据，不把来源审计视为完整接入。

内部PokemonTechRecord初稿现已加入五实体读取与克隆编辑。目录返回逻辑索引／显示编号、实际候选、记录旗、当前／进化／可疑许可提示、当前招式提示、三语招式与类型、批量容量／总容量及完整原始记录。七动作区分手动保存、四种Give All分支、Remove All和父Shift；后两种不保存窗口草稿，其他要求完整且唯一的候选行，按逻辑索引写入后直接调用Core。五实体×四种族、每一可见物理位／SV分区边界、七动作完整实体独立Core对照、LA高位／商店保护及原子拒绝专项59156退出码0。

内部TechRecordSession已加入两种完整文件路径与冻结生命周期，源／目标hash及目标六字段绑定，记录完整原始位变化而不只比较可见行，保留ZA批量未显示位的预览证据。存档仅实际SAV8SWSH／SAV8BS／SAV8LA／SAV9SV／SAV9ZA，重开具体类型验证校验／长度／队伍／完整实体；不放宽通用CanEdit或生产SaveUtil识别。二十单只加密／存储布局、五存档箱子／队伍、七动作完整文件Core对照与过期／替换／针对取消／重复／失败清理专项21221退出码0。合成类型路径不接受为真实存档识别。

前端领域模型与七项专项85389通过：五格式候选／批量／原始容量分离、完整且唯一的逻辑行、独立草稿、Remove All／父入口不保存行、Z-A显示号分离、来源／目标hash及六字段绑定、完整原始变更范围（包括非可见位）。API149四个JSExport／required JSON、八种Worker请求及两正式三语入口已接；公开接口专项37479和前端三文件83项通过。共用MoveShop控件／列表样式，支持七操作、源码许可／当前招式提示、类型图、冻结逐项／原始差异和列表外位变更计数。两入口共用组件与既有工作副本／撤销，语言切换保留草稿，关闭／换格位针对取消。新核心、最后类型、完整verify、默认完整原生及裁剪已通过；页面／真实存档仍待核验，本批准备提交。

## 招式商店（API 148 工程通过，页面待核验）

首轮21193及两路径冻结69253作为早期工程记录保留，最终证据以API148完整检查为准。单只文件复用现有序列化回读，存档用实际SAV8LA类型重开；合成夹具不能替代生产公开识别、真实存档或所有者验收。

API 148 增加四个招式商店 JSExport，存档和单只 PA8 各四种 Worker 请求。正式入口位于宝可梦详情的“招式商店”折叠区，两条路径共用 MoveShopEditor、既有 Select／按钮／表单样式，44px 控件与点击区域、15px 控件文字、14px 表格文字；列表自身滚动，不新增主题。中／英／日操作、招式和属性名称齐备，导入19张来源未修改类型图标（10478字节）。完整61项保持物理索引，类型按源属性／许可／名称排序，购买与掌握首次排序为已勾选在前；不许可项仍可手动编辑并明确提示。

六种来源操作、两组尾部三位保留、完整输出冻结／单次确认／明确目标绑定／过期取消和原件保护已接两入口及既有工作副本／撤销。父PKMEditor的Shift恢复操作使用明确的“按遭遇恢复初始记录”选项，不保存子窗口草稿。预览显示逐招式购买／掌握前后、两组完整原始记录与变更字节数。存档专用写入仅实际SAV8LA，不扩大通用 canEdit 或 SaveUtil 识别。

原生专项95792退出码0：12个种族等级组合、全部61索引和三语名称、六动作完整实体Core对照；四种PA8布局、LA两修订的箱子／队伍在六动作下完整文件对照、冻结生命周期、公开单只文件JSON通过。默认完整原生23975退出码0；前端专项73项、定向lint54737、核心构建14548、最后类型82594、裁剪及完整verify27411通过（282文件／1279项、PWA257项）；99个框架文件和19张属性图标的public／dist完整SHA-256一致。初次类型21788的旧快照失败已修复。Chrome本地5173未得到页面上下文：登记的外部Chrome标签请求返回nodeRepl.fetch request failed；页面与真实存档未核验，不能称为所有者验收或PKHeX完整接入。

## SCBlock 区块工具（API147 工程通过，页面待核验）

完整原生18124默认总链已成功结束，退出码0；结合最新完整verify62651及Core／扩展裁剪62546，工程门槛通过。保留正式浏览器文件／目录处理、Worker实际运行及真实存档验收待项，不把合成四家族对照称为公开识别完成。

最新完整verify62651通过：281文件／1266项、格式／Lint／类型／网页／PWA257项，99个框架资源SHA-256与打包输出一致。Core发布及四SC访问器扩展裁剪62546通过，精确保留21／12／23／34个属性与常量字段／方法等元数据；IL2026提示保留，不将裁剪元数据验证等同浏览器运行。完整原生18124已实际通过本模块四家族全部断言，仍继续后续模块，未取得总终态；正式Chrome页面和真实存档未核验。

下一独立候选 `MoveShopEditor` 只读来源记录：已核对完整窗口／Designer、IMoveShop8.cs、MoveShopRecordApplicator.cs 与 PA8 记录 getter／setter。窗口显示 Permit.RecordPermitIndexes 全表，1基索引，允许手动勾选不许可项，许可色只用于提示；保存逐显示索引写购买和掌握旗。All 先保存，再按 Shift 调 SetPurchasedFlagsAll＋SetMoveShopFlagsAll、Control 清两组旗再对当前招式建议、默认只对当前招式建议；None 先保存再 ClearMoveShopFlags，Core明确同时清购买和掌握，不能按窗口中Shop接口名称误以为只清购买。建议依赖种族／形态的等级学习和掌握等级、当前等级／招式、许可表与头目招式；不会无条件置全部旗true，旧已掌握旗在建议中保留。此处仅来源核对，未混入SCBlock功能实现；后续还需核对Personal许可长度／字节尾部与合法性及两种实体编辑路径。

`PA8.cs` 购买与掌握各8字节位于0x155／0x15D；`PersonalInfo8LA.cs` 的 MoveShopCount／RecordCountUsed和完整候选表为61项，许可位位于Personal的0xA8。可见索引0–60，1基显示1–61；手动保存及Core清理循环只覆盖61位，最后三位必须保留，不能清整个8字节Span。当前仅确认原数据来源，后续需存档实体与单只PA8两条路径的完整字节夹具、批量动作顺序以及类型图标资源核对。

目录输入提供普通多文件与文件夹切换，webkitRelativePath只保留选定根目录直下的文件，保留原顺序；两文件60项前端检查通过，实际Chrome文件夹选择待核验。四家族ZIP专项82143通过，逐个核对所有非空块的源名称和bytes。默认原生总链已加入该模块。四个SC访问器需要反射属性／常量，显式裁剪根已加入，新核心＋扩展元数据62546运行中；生成器后续须保留这些显式根，不能只靠调用SCBlockMetadata的未裁剪标记。

API147 六种公开JSExport／Worker和三语正式工具入口已接；27995原生required JSON／公开失败预览清理通过，前端客户端／领域59项通过。工作区按目录、导出、名称设置与比较分组，目录50项／raw3072字节分页、冻结全块及逐文件结果确认、旧票据与迟到预览清理接原工作副本。导出全部非空区块使用本地无压缩ZIP，保持源文件名与完整bytes；最新ZIP82143工程专项运行中。UI最后Lint通过，类型／新核心／裁剪及完整门槛未收齐，页面／真实存档未验收，不宣称窗口完成。

四家族第二轮原生专项 50435 通过，确认全部16组合导出与独立操作全文件结果、读取及失败请求原件保留。内部 SCBlockSession 已加入完整输出冻结、来源／目标哈希与单次确认、针对令牌取消和部分成功必须确认；追加会话专项 16235 运行中，不能把前一轮结果当作冻结验证。公开生产识别仍走 SaveUtil，不因合成样本放宽；测试内部按四种实际构造器重开只是工程路径。

内部 SCBlockEditing 初稿已加入独立克隆的元数据目录／分页／选中 raw、单块／非空目录／全部16选项导出、有序布尔／等长导入／目录部分成功结果及原版报告加完整结构字节比较。四实际家族的原生初稿包含独立完整文件 oracle，首轮 41788 编译运行中；随后追加输出回读逐块核验，首轮快照不是最后结果。协议146保持不变，冻结会话、公开 API、Worker、正式三语入口与新核心均未接入，不能称为已完成窗口。

2026-10-13 只读核对 `Gen8/SAV_BlockDump8.cs`／Designer、SAVEditor 调用点与 `SCBlockUtil.cs`。入口按 ISCBlockArray，不限名称里的第八世代。完整范围为键目录／名称过滤、Bool1／Bool2 切换、当前块等长导入／导出、目录批量导入／全部非空块导出、单文件四个选项以及双存档比较。默认选项仅 DataOnly + FakeHeader，Key／TypeInfo 未勾选；FakeHeader 经 BinaryWriter.Write(string) 写入长度前缀，并非纯 ASCII 拼接。十六进制显示区只读，PG_BlockView 在来源只切换 Visible、没有 SelectedObject 赋值，不将空 PropertyGrid 当作已实现任意结构属性编辑。额外键名与排除名单来自桌面设置，网页需本地文件／设置替代；CompareSaves 的第二次长度检查误指向旧文件，应明确源异常并分别核对两个输入。后续还需完整核对 SCBlockMetadata／Compare／TypeCode 和目录导入，当前仅记录来源，不混入相册实现。

后续只读核对 `SCBlockMetadata.cs`／`SCBlockCompare.cs`／`SCTypeCode.cs`／`SCBlock.cs`／`Util.cs`：实际 ISCBlockArray 家族为 SAV8SWSH、SAV8LA、SAV9SV、SAV9ZA。目录沿来源先命名项、再类型排序；排除名单仅过滤常量名称，不能据此删除物理区块。额外键名按 TAB 解析 ulong 十六进制再转 uint，已有名称与重复键第一项保留。文件夹只枚举顶层文件，不限扩展名；文件名移除扩展名和首个 ASCII 空格后的值摘要，以 GetHexValue 跳过非 hex 字符并按 uint 位模式解析；逐文件等长导入，失败记录而已成功项保留，重复键按文件顺序覆盖。网页需保留顺序与成功／失败结果，在克隆中冻结整体输出，并明确展示部分成功。导出目录只含非空 Data；单文件 16 种选项组合须逐一与 Core 对照，None 使用源解密 raw 线格式，而非单纯 Data 拼接。源比较分别记录新增／删除／类型／长度／值／对象 bytes；类型变化会跳过后续 bytes，Array SubType 变化和 NaN 位模式差异可能不在源报告体现，网页应同时给源原文及完整逐块结构／bytes 对照。Bool3 被 IsBoolean 判为 true，但 ChangeBooleanType 只接受 Bool1／Bool2，应显示实际类型并原子拒绝不可切换项。Designer 未设置键输入 MaxLength，八字符只用于 Enter 的键跳转判断，不能擅自限制名称过滤为八字符。这些仍是下一模块来源记录，尚未增加功能实现。

## 神秘礼物相册（API 146 工程通过，页面待核验）

最后图像追加后的完整 verify 95943 已通过：280 文件／1256 项、格式／Lint／类型／网页／PWA 257 项，99 个核心框架资源与打包输出 SHA-256 一致。完整原生 99420 默认链已结束，退出码 0，包含相册全部新增用例；核心发布／228 根类型和两个程序集扩展裁剪 21800 通过。页面与真实存档仍待核验，工程结果不作所有者验收。

当前图像使用源宝可梦／蛋／玛纳霏蛋／物品资源；网格、详情与导入预览共用 WondercardImage，携带物使用本地物品图片叠层，异色使用和箱子相同的星号及三语可访问名称，已用透明度作用于完整图层。两项渲染专项通过，覆盖三语与空卡／物品卡不显示残留实体标记。没有宣称逐像素复刻桌面 SpriteBuilder：源异色星图、蛋下层物种透明度、可选精灵球与遭遇背景设置仍需后续对照；正式浏览器图片处理仍待核验。

2026-10-13 只读核对 `Subforms/Save Editors/SAV_Wondercard.cs`：通过 IMysteryGiftStorageProvider 取得相册，窗口限 Gen4–7，HGSS 额外锁定胶囊槽。查看／设置／删除、已领取标记、全部已用／未用、相册槽位移动、导入／导出与 QR 是独立能力，不能由现有实体礼物导入代替。设置必须检查卡片兼容性、同类型首个空槽重定位、PCD 转 PGT 及锁定胶囊第 11 槽；删除按类型将连续非空卡片前移。保存 Gen4 配送员激活及 PGT 关联、HGSS 胶囊，Gen5 调 EndAccess 重新加密；标记保存按来源先清再写列表。追加只读核对拖放／QR：Gen4 相册为 8 个 PGT + 3 个 PCD，HGSS 追加胶囊；Gen5–7 按实际数量六格分行。外部拖放按长度识别与扩展名解析，PCD 可向 PGT 转换，流程与普通设置的兼容检查不同，不能误合并。QR 导出排除空卡和 Gen6 无限船票，导入检查解析状态、相册长度／类型及 CanReceiveGift。已读取 Drawing.Misc QRDecode／QREncode：原导入调用 qrserver 外部 HTTP API，原导出依赖 QRCoder + System.Drawing；这两条实现不能直接移植。网页需保留 Core QRMessageUtil 载荷，使用随包的本地二维码编码／图片解码，替代剪贴板 URL／网络服务，不能放宽静态架构。已读取 SAV4.cs MysteryBlock4／Gen5–7 MysteryBlock／LGPE WB7Records：Gen4 8 PGT + 3 PCD、Gen5 12 PGF、Gen6 24 WC6、Gen7 48 WC7、Let’s Go 10 WR7 摘要。记录大小依次 0x104／0x358／0xCC／0x108／0x108／0x140；领取范围 Gen4 窗口 1–2046、Gen5–7 1–2047、LGPE 1–4223。Gen4 卡片保存会重新关联 PGT／PCD 和配送员，Gen6 无限船票还调用 Sango 联动。LGPE ClearReceivedFlags 从块起始清 0x210 字节而非 FlagStart，保存卡片随后覆盖但尾部旧 flags 可能保留，须独立完整文件对照并明示源异常；WR7 是已领摘要，源隐藏已用／未用及 QR。后续还需核对完整移动边界与图像来源，当前仅记录来源，不开放入口或宣称接入。

`WondercardEditing` 内部初稿已建立完整相册及有序动作，读取原件 clone；初始十布局专项 86696 通过目录／加密原件和领取标记保存的独立完整文件 oracle。追加内部 WondercardSession 和十布局动作／冻结专项（41355 十布局通过；22086／37999 曾因共享 SAV5 夹具不为空的测试假设失败，已保留异常原件并增加明确清空动作夹具），单文件预览、QR 载荷导入与源限制导出已分离；尚未公开 JSON／Worker／入口或提升协议；完整动作、三语描述、图像、冻结及本地二维码仍待实现／验证，不把初稿视为窗口完成。

特殊分支专项 59009 通过胶囊／PCD 转 PGT／外部拖入／无限船票接收发送／三语资源与 QR 限制。追加 WondercardDetails 和结构化名称／图片／数量元数据，最新元数据专项 97854 通过，前端领域请求／冻结四项通过。源标题保留原语言，产品标签与生成详情按三语显示；原始图像编号与道具值分开，不因 Z 晶石图片映射改写数据。

API 146 已接相册读取、文件／QR 载荷预览、二维码载荷导出、冻结预览／确认／取消，公开 required JSON 十布局专项通过。正式三语入口使用共享 44px 控件、真实相册格位及本地图像，图片读取／二维码 PNG 编码在独立 Worker 处理，qrcode 1.5.4／jsqr 1.4.0 随包，无运行时 CDN／网络服务；[编码器来源](https://github.com/soldair/node-qrcode)、[解码器来源](https://github.com/cozmo/jsQR)。编码沿源 Q 纠错、4px 模块及 4 模块静区；图片上限 8 MiB／4096 边长／4194304 像素是网页资源限额。四类卡片长度及反色测试通过，正式浏览器图片文件处理仍待核验。源无限船票／空卡／WR7 限制继续在 Core 检查；最新公开 QR／UI 原生 63228、类型 94909、前端三文件 59 项均通过；追加 SAV5 解密前能力断言专项 43273 已通过，完整工程门槛未收齐，不宣称窗口完成。

## 通用区块属性窗口（API 145 工程通过，页面待核验）

只读来源 `Subforms/Save Editors/Misc/SAV_Accessor.cs`／Designer、`Controls/SAV Editor/SAVEditor.cs`、Core `SaveBlockMetadata.cs`／`ISaveBlockAccessor.cs`。调用点明确八种 accessor：BW、B2W2、XY、AO、AO 试玩、SM、USUM、Let’s Go；不能据窗口泛型外推到任意存档。

来源通过 Reflection 取得全部 IDataIndirect 命名对象，`GetSortedBlockList` 的排序与名称为块选择依据，选择后绑定原对象到 PropertyGrid，值变更直接修改调用方存档。原窗口没有额外 Save／Cancel 流程；网页仍按产品约束保留原件，在工作副本准备完整输出、冻结预览与确认，并提供撤销。Designer 的 Raw 页 PropertyGrid 未赋 SelectedObject，没有可执行导入／导出行为，不与独立 BlockDump 窗口混淆。

完整 collection-item 原生审计核对八访问器的 207 个命名对象，包含显式接口别名；目录含 22245 个可见属性节点、19184 个可写描述符与 28 个 getter 错误。初步涉及 164 个 Core 类型，仍须核对运行时子类、转换器和裁剪后的同等目录，不以数量代替编辑覆盖。来源 `EntreeForest.Slots` getter 在 BW／B2W2 原地解密，SAV5.GetFinalData 调 EndAccess 重加密；单纯浏览不能碰工作副本。可见 Span 的 PropertyGrid getter 无法反射调用，保留其只读／失败状态；合成样本的无效日期和 SM FieldMenu 边界失败单独记录，不能删掉对应属性。

`BlockAccessorReading` 原生读取初稿提供来源排序、完整对象名／别名、描述符与数组项树、转换器选项及错误状态，并在独立 clone 上读取。八访问器专项通过：森林 4244 个节点覆盖第 529 槽，服饰 5793 个节点覆盖第 1447 项，来源命名与原件不变通过，完整 collection-item 审计已重新生成。编辑器须完整覆盖标量／128 位数值／日期／枚举／数组与嵌套结构的源转换及回写，不能只依据部分专项称为全量完成。原生编辑与冻结初稿及结果见下文；泛型接口的裁剪标注不能替代实际 accessor 与块类型验证。API 145 已接 JSExport／Worker／客户端和正式三语区块入口；属性以每页 40 项逐层浏览、草稿顺序编辑和冻结前后差异确认。运行时对象与转换器裁剪根 228 类型／2 程序集已生成，首轮发布含嵌套类型 `+` 名称解析警告，已修正为 ILLink `/` 格式，新发布／扩展元数据检查 57631 通过：228 根类型／2 程序集属性、构造器、枚举字段、类型／属性 attributes、方法签名与方法体存在性一致；IL2026 仍保留，实际浏览器运行尚待核验。

`BlockAccessorEditing`／`BlockAccessorSession` 原生初稿已加入实际 PropertyDescriptor 转换、按字符串数组路径有序编辑、嵌套／数组／脱离对象回写、JSON 数组／对象替换与冻结输出。八访问器标量、森林第 529 槽、Radar 记录、道具数组、服饰第 1447 项、战斗树第 49 项、UInt128 最大值的完整源文件对照通过；原件、过期／重复确认、替换、旧 token 取消与失败预览清理通过。公开 JSON／八访问器冻结专项已通过；正式接线后的新原生专项 62177 通过（含四组合数组及男女外观 JSON 原样回写），扩展裁剪 57631 已通过；完整 verify 88612 已通过（277 文件／1239 项、最新核心网页／PWA 253 项），完整原生 11100 已通过，不以专项当作完整窗口验收。

PropertyGrid 的输入范围来自实际 CLR 类型和具体 TypeConverter，随后仍执行 Core setter 的存储转换／夹取／副作用；不因底层 bytes 较窄就自行缩小 int 属性的可输入范围。保留三种明确文化参数（en-US／zh-CN／ja-JP）、64／128 位字符串传输、枚举名称或数值、nullable 空值与数组结构。显示和写入采用同一文化参数，避免 invariant 的 Infinity 文本不能被 en-US 解析。nullable 空日期、NaN、实际文化 Infinity 符号、十六进制 0xFF、未知枚举 255 及三文化显示／提交完整文件 roundtrip 专项通过。最大 512 次有序修改、12 层路径、单值 4 MiB、数组 8192 项为网页资源限额，区别于源存储限制。正式 Worker／JSON／三语界面已接入 API 145。可编辑结构化对象提供当前 JSON 初值，整数及非有限浮点保持转换器文本，数组替换执行原 setter；新裁剪构建和两程序集元数据已核验，页面与真实存档仍待核验。

## 传说 Z-A 训练家（API 144 工程通过，页面待核验）

已核对只读 PKHeX 26.08.26 `Gen9/SAV_Trainer9a.cs`／Designer、Core `SAV9ZA.cs`、`SaveBlockAccessor9ZA.cs`、`Coordinates9a.cs`、`PlayTime9a.cs`、`PlayerFashion9a.cs`、`TechnicalMachine9a.cs`、`ColorfulScrew9a.cs`、`EventWorkStorage64.cs` 与 `Epoch1900DateTimeValue.cs`。`Trainer9aEditing`／`Trainer9aActions`／`Trainer9aSession`、产品 JSExport／Worker／客户端、正式用途导航与三语五分组已接，协议同步为 API 144。完整原生、最新三修订专项、最终完整 verify（276 文件／1229 项）、最终核心／26 类裁剪与最新核心网页均退出码 0，保留既有提示。三修订类型化工程夹具不等于公开识别或真实存档验收，页面仍待核验。

Designer 姓名 12 字、地图名称 32 字、街道名称 18 字；金钱／两种 Royale 点数／异次元调查点数均为七位十进制 mask。加号按钮分别填入 MaxMoney、310000、50000、100000，这些快捷值不是输入上限。小时五位且源 `ushort.Parse`，超过 65535 明确拒绝；分钟／秒两位，保存模 60。游玩时间实际在 `KPlayedSeconds` Double，三个 setter 保留小数秒，不写未使用的 PlayTime 数组。保存日期默认最小 1753-01-01、最大 4095-12-31；独立时间控件日期范围 2000–2060，保存合并日期与时分秒。

X／Y／Z／R 为六位小数、−99999999–99999999，无法有限表示时地图禁用。坐标或地图名称变化才触发 MapUpdated；源保存用 float 坐标、Core 角度到四元数及 epsilon 逻辑，地图按 32 字节 ASCII 保存。未触发地图事件时不解析或重写地图字段。基础信息保存在地图之前，DLC 保存最后；修订 0 没有 DLC 字段，修订 1／2 才写调查点数与 ClearZero 街道字符串。原始 UInt64 修订先检查，不能通过 int 截断接受未知修订。

性别实际变化才调用 `PlayerFashion.Reset`，仅重置服装／上身／下身三项，其余十项保留。TID／SID 即时事件复用源事件顺序，姓名高级字节通过 Core `TrashEditor` 对应操作处理，普通保存只在名称变化时写入。招式机按钮直接调用 Core，同时更新地面状态与背包数量。彩色螺丝包含普通收集、Alt 的剩余 100 个源位置列表，以及 Ctrl+Alt+Shift 的 `SetAllScrews(false)` 后收集；收集数量由 Core 返回，背包数量按源限制到 100。网页将源快捷键隐藏操作变为明确入口，位置列表可本地导出，不依赖系统剪贴板或后端。

三图片按当前／SBC／初始读取对应块，DXT1 的 BGRA 转 RGBA，提供 PNG／BMP／JPG 本地导出。原版三个点击处理器的默认文件名依次为 `KPictureSBCData`／`KPictureInitialData`／`KPictureCurrentData`，与所显示图片的键并非同名，目录保留这项来源行为。缺失、类型错误、双零尺寸与无效尺寸分别返回不可显示状态；最多 4096 边长与 4194304 像素为网页资源限额。读取与预览保留原件，冻结确认不重算，取消旧 token 不删除新预览。

姓名高级入口另对照 `Subforms/PKM Editors/Text.cs`／Designer：世代数值使用 WinForms 默认 0–100 范围，语言按 Gen9a 来源提供新增西班牙语，不能复用 Gen6 的语言白名单。18 个 Switch Unicode 特殊字符使用源列表，按钮向高级文本追加，沿用 12 字上限。前端三文件 56 项、完整文件 layer oracle 与 0／9／100 世代原生边界均通过。

空值行为再按 `SAV_Trainer9a.SaveTrainerInfo` 核对：小时直接 `ushort.Parse`，空值必须拒绝；金钱／点数的 `Util.ToUInt32` 空值为 0，分钟／秒的 `Change255` 空值归零，不能对所有 mask 统一补 0。Core／domain 已修正小时空值，最后三修订完整文件专项 28944、最终完整 verify 89701 与最后核心／裁剪／网页 69970 均通过。

## 第九世代训练家（API 143 工程通过，页面待核验）

完整 Core 字段／图片读取／源操作、冻结会话、JSExport／Worker 与正式三语共享控件入口已接。六类型化版本／修订工程专项覆盖原件、完整独立源保存、地图四元数、三 DXT1 图像／尺寸保护、全部解锁、ID／姓名 trash 和冻结生命周期。完整原生 26960、完整 verify 75539（275 文件／1217 项）、核心／26 类裁剪 53559 与最新核心网页 22130 均退出码 0，保留既有提示。不能把类型化夹具等同 SaveUtil 实际识别或真实存档验收；页面与真实存档仍待核验。

模块来源 `Gen9/SAV_Trainer9.cs`／Designer、`SAV9SV.cs`、`SaveBlockAccessor9SV.cs` 与 Core `DXT1.cs`。范围包括朱／紫、性别、语言、姓名／训练家 ID、金钱／联盟支付点／蓝莓点数、游玩时间／入学与保存日期、坐标／旋转、当前照片／当前图标／初始图标本地查看导出，以及服饰／坐骑／招式机／封印木桩／飞行点解锁；修订 >=2 增加蓝莓任务、投球风格／教练／点心传说操作。

Designer 限额：姓名 12 字，金钱／LP／BP 七位十进制 mask，游玩小时五位、分钟／秒两位；地图 X／Y／Z／R 六位小数，−99999999–99999999，载入无法 decimal 表示时地图禁用。地图只有 ValueChanged 才 MapUpdated，保存转换 float 坐标与 angle=R×π／360，写旋转 (0,sin(angle),0,cos(angle))，不是普通单角度直接存储。蓝莓单人／组队任务 UInt32 最大值，投球风格 index+1。

源保存顺序为基础训练家、地图（仅 MapUpdated）、蓝莓（修订 >=2）。姓名只有文本变化时写以保留 trash；分钟／秒 ushort.Parse 后模 60，语言／游戏实际源列表。入学日期 1932-01-01–2050-12-31，保存日期最大 4095-12-31，独立时间控件 2000-01-01–2060-12-31；保存日期控件默认最小1753-01-01；TID六位／SID四位即时写入SID再TID，Core按源事件处理空值和UInt32边界。三图片为各 data／width／height block 的 DXT1 解压；源图片点击只导出 PNG／BMP／JPG，没有图片导入入口。Core 解压输出 BGRA，网页须转换为 RGBA 后本地显示与导出；尺寸／块存在性和三位置像素工程专项已通过，API 143。

## 圆庆广场（API 142 工程通过，页面待核验）

完整原生、完整 verify（274 文件／1205 项）、API 142 核心发布、26 类裁剪与使用最新核心的网页构建通过。当前实际工程文件专项为 SN／US，其他同家族版本与真实存档仍需扩大核验；页面未验收。工程结果不代表完整 PKHeX 目标已完成。

Core 有序动作、冻结会话、JSExport／Worker、正式用途导航与三语共享控件已接。SN／US 完整源保存字节 oracle、全部设施类型的颜色边界、动态胜场、三代理人两种完整实体导出、失效／替换／取消／重复确认与原件专项通过；前端三文件 47 项、接线 Lint 与类型通过。完整原生／verify 正在运行，新核心未发布，页面／真实存档未验收。日期、FC、奖励、短语及代理人均属于本模块范围，下面的来源核对保留。

下一独立模块来源 `Gen7/SAV_FestivalPlaza.cs`／Designer 与 `JoinFesta7.cs`、`FestaFacility.cs`。入口 SAV7，SM 设施类型上限 0x7C、USUM 0x7F；只有 USUM 展示对战代理人。范围包含七设施、短语批量解锁、奖励三态与批量就绪／领取、广场名字／等级／FC／开始日期、自己的四消息，以及对战代理人三只宝可梦／队伍导入／导出／邀请／等级胜场／三训练家／眼镜解锁，已按当前 API 142 接入。

Designer 实际限额：广场名称 20 字、访客训练家姓名 12 字；当前／已用 FC 0–9999999，等级 0–999，消息 0–9999，剩余交换 0–255，颜色 0–7 但根据设施类别动态收紧；UsedFlags／UsedStats 十六进制各八字、设施 ID 24 字。代理人三训练家 0–210、击败宝可梦 0–65535、等级 0–50；胜场动态最大值 `(min(49,grade)/10*3)+2`，不是固定 15。

源保存顺序为短语（显示首项映射 106，其余 i−1）、记录 38 已用 FC、FestaCoins（Core 联动 TotalFestaCoins）、日期、奖励（首项映射 10，其余 i−1，状态映射 0／2／1）、当前设施、USUM 代理人。设施切换先 SaveFacility；类型变化收紧颜色但只在实际越界时写，其他事件分别直接更新消息／十六进制／名字／性别／introduced。SaveFacility 再规范化颜色／名字／NPC／introduced，并按类别清除非交换 ExchangeLeftCount、非占卜 LuckyRank／Place；不能把只修改部分字段等同于源完整重保存。

USUM 代理人数据直接在 SAV.Data：三只实体 6C200（stored）、6C2E8（party）、6C420（party），邀请掩码 0x7DFF 位于 6C3EE／6C526；只有邀请状态变化才改，取消邀请写零。选择标记 6C55E bit1，等级／胜场 packed UInt16 为 6C55C，击败宝可梦 6C558，训练家从 6C56C 起步长 14h；确切保存与边界仍继续来源核对。核心 JoinFesta7 使用公开块：设施 310h 起每 48h、FC 508h／总 FC 50Ch；FestaFacility 访客 ID 34h／12 bytes、flags 28h／stats 2Ch。日期、类型颜色映射和导入导出已按来源接入；短语日／英文本取上游，中文为本地显示翻译，API 142。

源追加核对：日期控件范围 2000-01-01–2050-12-31，Core 日期为空时显示 2000-01-01。广场名称文本仅在 SaveBattleAgency 末尾写 Festa.FestivalPlazaName，SM 的 Save 不调用该路径且没有 TextChanged 写入，不能把 SM 同一显示框假定为实际已保存。设施 NPC 使用表单八项选择、未知值回落 0；消息选择会先保存前一消息。删除访客仅在 IsIntroduced 为真时 ClearTrainerFesID，然后清 introduced／名字／性别／四消息；保留类型／颜色／其他使用数据。代理人 import 只替换前三个实际存在队伍成员，其余保留；导出用当前 p[i]，须使用实体格式与完整 bytes。

## 邮箱编辑器（API 141 工程通过，页面待核验）

完整原生、完整 verify（273 文件／1191 项）、API 141 核心发布、26 类裁剪与最新网页构建通过。真实页面／存档未验收；当前实际文件夹具覆盖 E／D／Pt／HG／B／B2，Gen2 多语言与 Stadium2 为类型化工程夹具，其他同家族布局和极端源选择还需扩大覆盖，不把工程通过等同于全部实际存档已验收。

Core、冻结会话、JSExport／Worker、独立用途导航与三语界面已接，保持原件并接工作副本／撤销。字段和选择控件复用共享样式；编辑预览后再改草稿会禁用旧确认，关联问题需明确勾选接受才应用。源对象移动保持 DataOffset 语义，删除选择显式保留或清关联持有道具。专项覆盖实际六布局、Gen2 多语言和 Stadium2 类型化工程数据；完整工程、新核心及页面／真实存档仍待收尾，下文保留来源核对。

下一独立模块核对来源为 `SAV_MailBox.cs`／Designer、`MailDetail.cs`、`Mail2.cs`–`Mail5.cs`。SAVEditor 入口为 SAV2／SAV2Stadium／SAV3／SAV4／SAV5；实际构造分支与可导出布局还需按 Core 验证，不按世代粗放开放。

Gen2 普通存档固定六封持有信件、十封邮箱信件，邮箱显示数量 0–10；Stadium2 为三十封持有、五十封邮箱，数量 0–50，没有队伍编辑。Gen3 固定六加十；Gen4／5 为实际队伍数加二十。作者输入 MaxLength=7，Gen2 两行消息各 MaxLength=32；作者 TID／SID、数字消息、Gen5 三项杂项／结尾均 0–65535。Gen3 消息 3×3，Gen4／5 为 3×4；队伍 HeldMailID 仅 Gen3 可编辑，范围 −1–5。种类、语言和游戏选择由 Core FilteredGameDataSource 与 LanguageDataSource 提供。

源 TempSave 顺序为作者姓名、TID、语言、信件类型；Gen2 再图案与两行消息／用户输入标记；其他世代再 SID、数字消息。Gen3 图案通过 SpeciesConverter.GetInternal3；Gen4／5 再作者版本与保留高位的性别，Gen4 三图案按选择编号加七，Gen5 三杂项与结尾。未知原始值与源界面重保存的规范化行为需分别核对。删除有仅删信件／同时清关联道具／取消选择，确认检查输出关联错误，允许源界面的明确继续保存路径；不得把提示静默改成自动修复。

Gen2 保存复制六封持有和数量／十封邮箱的备份区，Stadium2 写其独立数量字节；Gen3 通过 LargeBlock；Gen4／5 的队伍信件通过 PK4／PK5.HeldMail，邮箱通过 GetMail 的实际偏移，最后写回 PartyData。只读 Core getter 可能改变脱离的 Mail2 EnglishGS 数据，因此后续需校验读取不改变原 bytes。移动是交换 MailDetail 对象，其 DataOffset 随对象保留，保存效果不能未经工程对照假定为物理交换。Mail4.SetBlank(lang,version) 清空 56 字节并设语言／版本，和其构造器 ResetData 的 0xFF／0xFFFF 不同，须照实际方法处理。Core／会话／Worker／三语 UI 已接，API 为 141；最新专项已验证读取不变、源对象偏移移动、字段和删除完整文件对照。

## 录音工具（API 140 工程通过，页面待核验）

完整原生、完整前端 verify（272 文件／1179 项）、API 140 核心发布、26 类裁剪属性与使用最新核心的网页构建均通过。保留既有警告；工程合成存档不代表真实存档和页面验收，外部 Chrome 当前连接超时。

JSExport／Worker／客户端与三语界面已接。独立导航复用用途分组，控件复用共享工具栏、文件选择与勾选样式；混乱几率只读。每次修改生成冻结预览，确认才写工作副本并进入撤销历史；关闭释放票据与音频，下载 URL 延迟释放。最新前端四文件 60 项通过，类型／Lint／最新协议原生专项与完整工程尚待收尾，新核心未发布，页面及真实存档未验收。下方初稿检查记录保留为阶段证据。

已只读核对 `SAV_Chatter.cs`／Designer、`IChatter.cs`、`Chatter4.cs`／`Chatter5.cs`。来源仅提供 Initialized 勾选、PCM 导入／导出、WAV 导出、播放和保存／取消，没有实时录音入口；浏览器使用文件选择、下载与本地音频对应，无服务端或系统 SoundPlayer 依赖。PCM 必须恰好 1000 bytes，导入同时设 Initialized=true；WAV 是源固定 44-byte header 加 2000 个 unsigned 8-bit 样本，2000 Hz 单声道，每字节先低四位左移 4，再高四位。未初始化且样本全零时播放无操作，未初始化但非零样本仍可播放。混乱几率由 Core 计算；Designer 的三位 MaskedTextBox 没有保存读取，网页不将该显示值伪装成可写存档字段。

两个世代 Initialized 都仅在首四字节 UInt32==1 时为真；显式设置写 0／1，未知原始标记未操作时需保留。Gen4 使用 recording[15] 的 signed byte：已初始化时 <−30 为 11%、>=30 为 31%、其余为 1%；未初始化为 1%。Gen5 使用 recording[99]^recording[499]^recording[699]：已初始化时 <100 或 >=150 为 10%，其余为 0%；未初始化为 0%。SAVEditor.B_OpenChatterEditor.Visible 确认仅 sav is SAV4 or SAV5；生产读取类型为 SAV4DP／SAV4Pt／SAV4HGSS／SAV5BW／SAV5B2W2，不包含 Battle Revolution。注册队伍已收尾提交，当前独立实现录音模块。

ChatterEditing Core 已接读取、源事件顺序的勾选／PCM 导入和完整导出／重读校验，专项通过。Gen4 标记／录音共 1004 bytes，相对 active General 的地址为 DP 61CC、Pt 64EC、HGSS 4E74；不假定当前文件分区。Gen5 使用公开 Chatter.Data，block 36 位于 1D500、长 03EC，BW 两处校验字段 1D8EE／23F48，B2W2 为 1D8EE／25F48；只调用 Core 写入／计算校验和。原始四字节标记保留，重复相同勾选值不模拟不存在的 CheckedChanged；勾选 true 再 false 保留实际事件顺序。请求最多 512 个动作、Base64 文本最多 2048 字符是浏览器资源限额，实际 PCM 仍恰好 1000 bytes。所有动作和导入数据先完整验证，失败不写任何字段；原件仍保留。冻结会话与 JSExport／Worker／三语界面已接，协议为 API 140。

五布局 Core 与冻结会话专项已通过。ChatterSession 以来源／目标 SHA-256 与独立令牌保留完整输出，提供前后标记／PCM／WAV／混乱几率、全部变化文件偏移与变化 PCM 字节数；确认仅复制缓存，取消丢弃，旧令牌关闭不清除新预览。过期来源、替换、重复确认及失败预览清理均已检查；只读 JSON 与源生成 DTO 已接，JSExport／Worker 和三语播放／文件操作界面已接，最新完整工程正在收尾；页面与真实存档未验收。预览 JSON 最多 2 MiB、确认最多 4096 字符属于浏览器资源限额；来源哈希与动作字段必填，不能默认为空修改。

## 仓储查看器覆盖复核（BoxList／第二箱／注册队伍工程通过）

2026-10-12 开始 BoxViewer。窗体源 SAV_BoxViewer.cs／Designer 将第二窗设为 CanSetCurrentBox=false；主窗 SAVEditor.Designer.cs 为 true。SwapBoxesViewer 交换两窗的 CurrentBox 显示索引，不调用 SaveFile.SwapBox；左右键按 Core BoxEdit.MoveLeft／MoveRight 循环，单独 Ctrl 跳首／尾。下拉有效编号为 0–BoxCount−1，载入越界显示索引回退 0。主窗 GetBox 将当前编号写入 SAV.CurrentBox，第二窗导航不写。

当前箱子持久化由 Core 的 15 个 override 家族决定：SAV1、SAV2、SAV3、SAV3RSBox、SAV4HGSS、SAV4Sinnoh、SAV5、SAV6AO、SAV6XY、SAV7、SAV8BS、SAV8LA、SAV8SWSH、SAV9SV、SAV9ZA；SaveFile 基类的自动属性不序列化。SAV1 setter 保留原高位初始化标记。新增独立 CurrentBox 请求限制为整型 0–BoxCount−1，并拒绝和箱名、壁纸、交换、批量等操作混用；写入复用 Core 与全文件复读验证、工作副本／撤销，不开放这些格式的其他未实现编辑行为。双箱组件与辅助函数已写，产品接线、新协议、扩大工程和页面核验仍待完成，不能标记功能完成。

API 138 已接双箱模式、两个独立选择器、循环／首尾导航、显示交换及共用详情／文件操作／拖放。主箱首次显示取实际保存编号，越界仅显示回退；第二箱初始同主箱，两个视图共享工作副本、图像／壁纸和来源修订。主箱显式选择按独立元数据能力写入工作副本，不受通用宝可梦编辑白名单影响；第二箱和格位详情选择不写编号。原版窗体滚轮在格位上下文菜单可见时停用；网页保留显式上一箱／下一箱／首箱／末箱与准确 Ctrl 修饰规则，窗口位置采用响应式工作区两窗并排／窄屏顺序布局。API 138 最新专项、完整工程、核心及裁剪检查均通过，外部浏览器与真实存档核验仍待完成。

工作副本导出同时识别当前箱子元数据能力，保留已经验证的完整文件 bytes；不扩大其他宝可梦写入能力。端点编号专项包含导出 bytes 完全相等的检查。

RS Box 的源码 CurrentBox getter 为 BoxBuffer[4]×2，setter 写 value／2，因此奇数显示编号保存为前一个偶数编号。显示仍可选择全部 50 箱，重新读取与校验使用这一来源映射；不能把奇数请求的原值误认为保存结果。剑／盾、朱／紫、Z-A 各修订与阿尔宙斯两修订补充类型化区块专项，严格区分 Core 工程检查与 SaveUtil 生产识别。

完整原生与完整前端 verify 已通过（270 文件／1158 项）；最新专项包含工作副本完整导出、17 个类型化区块组合和 RS Box 两语言各 50 个显示编号。首次类型化专项因 BlankSaveFile 缺少零长度箱子标记布尔块失败，修正只在本专项夹具补入访问器定义的键，保留完整输出与重新读取校验；不扩大生产检测。API 138 核心发布、裁剪后属性及最新网页打包均通过，页面／真实存档未验收。

已读取同版本 `SAV_BoxList.cs`／Designer、`SAV_BoxViewer.cs`、`SAV_GroupViewer.cs`、`Controls/SAV Editor/BoxEditor.cs`、`SlotChangeManager.cs` 与 `Controls/Slots/SlotUtil.cs`。BoxList 同时创建全部箱子视图，左右按钮交换相邻箱并首尾循环；槽数与列数来自 Core BoxSlotCount／5，不按固定 30 格假定所有格式。BoxViewer 已接独立第二箱，复用共享 Select、工具栏按钮与实际格位组件，按钮高度继承工作区令牌；完整工程检查通过，页面待核验，不能以全箱页面代替第二箱能力。

API 137 已在 SavePokemonBrowser 接入当前箱子／队伍与全部箱子切换。SaveBoxGallery 同时呈现全部物理箱子，包括空箱；SaveBoxGrid 复用真实位置、原版壁纸及本地宝可梦图像，支持点击详情、槽号／状态／悬停摘要、方向键与 Home／End 定位。全部视图保持同步，修改继续使用工作副本／撤销／导出，不修改原件。相邻整箱交换直接复用已验证的 Core SwapBox 路径，禁止不可编辑或受保护数据，不额外写入名称／壁纸草稿。

跨箱拖放按源规则：默认空位移动、已有格位交换；Shift 单键复制，Alt 单键覆盖并清空来源。其他组合不作为单键修饰符。显式操作选择及详情中的普通按钮提供触屏／键盘替代。覆盖是 Core StorageEditing 的单次原子操作，不串联两个写请求。拖放来源携带本次组件随机标识与工作副本修订，拒绝其他窗口或过期来源；外部文件按上游 TryLoadFiles 取首个文件，通过既有导入链处理。队伍操作沿用详情按钮；原生 OS 文件拖出以显式导出下载替代，文件夹批量导入沿用已有文件夹选择入口，不读取任意系统路径。

页面按实际箱数及槽数生成全部格位，不分页裁掉空格。普通 30 格箱子至少保留 44px 点击范围；全箱结果区滚动、图片按需解码，窄屏收紧边距而不缩小文字或点击范围。默认拖放不会自行增加格位、修改箱子解锁数量或处理未知原始数据。前端五项包含三箱 90 个真实／空格位输出、相邻循环、精确修饰符、来源范围／修订与键盘几何。

2026-10-12 完整原生 48249、完整 verify 14683、API 137 核心发布 3862、裁剪与最新网页 29002 均退出码 0；268 文件／1147 项、26 类裁剪元数据和最新网页／PWA 已通过。覆盖与队伍专项 36644 保留完整文件字节对照，SAV7 测试解析复制后的输出数组，避免解析器自身清除 MemeCrypto 签名污染比较。外部 Chrome 仍返回通信错误，工程通过不等同页面或真实存档验收。所有者已认可独立存档工作区布局方向及统一控件要求，随后按 docs/ui-design.md 迁移。

GroupViewer 使用独立 SlotGroup，自动选择首个非空组，按组槽数重建网格，提供图片、悬停详情、合法性标记与选择详情，左右循环并可跳到首尾。各专属模块的队伍显示不能代替这些注册组。2026-10-12 已接 RegisteredGroups Core 目录与独立 Group／Slot 位置，保留每组六个物理成员，空位返回 null，成员克隆后读取／分析，不能作为普通箱子写入。API 139 已接 JSExport、来源生成 JSON、Worker 与三语用途入口；完整工程、新版核心、26 类裁剪属性和最新网页检查通过。

GroupViewer.Designer 的下拉为 DropDownList，没有自由数字输入；有效组编号是 0–Groups.Count−1，格位是 0–当前组 Slots.Length−1。左右按钮以任意包含 Ctrl 的组合跳首／尾，普通按钮循环；这与第二箱 BoxEditor 的精确 Ctrl 条件不同，不能复用其修饰判定。网页使用共享 Select、普通查看／导航按钮对应下拉、Ctrl 点击和 View 菜单，六格排列按容器重排，不复制桌面 32×24 像素按钮。窗口位置与滚轮用工作区及显式导航替代，保留键盘和触屏路径。

API 139 最新公共接口专项按真实箱子 header／stride／footer 位置补充工程识别标记，初代为 POKE=454B4F50，二代为 P3v0=30763350，再由 Core.Write 计算校验和，不垫充长度或改变生产识别。最新专项退出码 0，五布局的源生成 JSON、SaveUtil 识别、完整公开报告及携带组位置的分析响应通过；真实存档仍未验收。读取在 StrictMode 重用同修订 Promise，卸载／修订变更拒绝迟到分析。操作、入口与注册组错误信息支持中文／英文／日文；组原始名称、顺序和训练家数据来自 Core。

最新公开接口／缺失字段／小数／字符串／越界／原件保留专项、类型、四文件 57 项及全部接线 Lint 均通过。Group／Slot 的 JSON 字段为必填，不能将缺失选择默认为 0。前端覆盖本地图像、物理空格、三语训练家描述与错误、跨组旧分析隔离及只读 Worker 客户端响应；完整工程、API 139 核心及最新网页通过，不等同页面或真实存档验收。

五种 Stadium 类型化 Core 读取专项通过。初代原始实体是 PokeCrypto 内部 SIZE_1STORED=33 bytes，随后分别为昵称／训练家姓名，日文各 6 bytes，国际各 11 bytes；不能使用带列表包装的 PK1.SIZE_STORED。SAV1StadiumJ 空白构造器调用该列表写入，在本版本抛出越界；专项使用 SIZE_G1STADJ=0x8000 的原始数据构造器，不把构造器缺陷修补进只读上游。其余初代／二代使用 Core SIZE_G1STAD／SIZE_G2STAD=0x20000 原始数据构造器，补齐上述来源标记后通过 SaveUtil 及公共接口工程检查，不构成真实存档验收。合法性标记与详细分析使用组实际 StorageSlotType、存档 Personal 和克隆成员；五布局专项、Worker／产品入口及 API 139 接线均通过工程检查。

2026-10-11 继续核对实际调用点 `Controls/SAV Editor/SAVEditor.cs:B_OtherSlots_Click`，该版本只对 `SAV_STADIUM.GetRegisteredTeams()` 打开 GroupViewer，不是任意游戏的特殊槽统一入口。`SAV1StadiumJ` 返回 16 组，每组六只，交错的备份队伍不另列；`SAV1Stadium` 日文返回 108 组，国际版从 90 组移除两类各 10 组的未使用队伍，显示 70 组；`SAV2Stadium` 返回 60 组，每组六只。组名与实际顺序必须由 Core 返回，不能用显示索引自行重算物理队伍偏移。

来源为 Core `SAV_STADIUM.cs`、`SAV1StadiumJ.cs`、`SAV1Stadium.cs`、`SAV2Stadium.cs`、`SlotGroup.cs` 和 WinForms `SAV_GroupViewer.cs`。原窗口 Ctrl 点击／查看菜单调用 `PopulateFields(slot, false)`，此查看器没有队伍写回路径；首个非空组、所有空格、合法性标记和悬停摘要均要保留。网页实现可用普通点击与键盘进入详情，并提供首尾按钮替代 Ctrl 修饰键，但不能把普通箱子或 Battle Revolution 战斗通行证当成该窗口的组目录。当前已按此范围接入，页面与真实存档仍待验收。

## 第九世代服装窗口（API 134，工程检查通过）

2026-10-11 已读取 `Gen9/SAV_Fashion9.cs`／Designer、Core `FashionItem9.cs`、`FashionItem9a.cs`、`HairMakeItem9a.cs` 和两种 `SaveBlockAccessor9`。朱／紫提供 Eyewear、Gloves、Bag、Footwear、Headwear、Legwear、Clothing、PhoneCase 共 8 组；Z-A 提供 10 组服装与 HairMake00–14 共 15 组发型／妆容。所有记录均为 8 字节：UInt32 Value 和 UInt32 Flags；实际行数取块长度整除 8，读取全部物理槽，写回保留尾部及未开放的 Flags 位。不依据块注释中的道具类别范围缩小 UInt32 输入。

朱／紫服装与 Z-A 发型／妆容只开放 Value、IsNew；Z-A 服装另外开放 IsNewShop、IsNewGroup、IsEquipped、IsOwned。Value 使用 `uint.TryParse`，完整范围 0–4294967295，None 为 65535；空白／无效编辑会取消并设为 None，整窗 Save 的无效值也归 None。独立控件探针 53556 在 .NET 10.0.12／WinForms 10.0.0.0 实际创建同配置列，确认 ValueType=UInt32、默认 MaxInputLength=32767。

“全部拥有”只在 Z-A 显示：普通作用于当前标签，Shift 作用于全部标签，Alt 改为取消拥有。服装组先保存当前行状态，再调用 `FashionItem9a.ModifyAll`，只对 Value != None 的记录修改 IsOwned；发型／妆容组此方法为空操作，不能额外添加不存在的拥有标记。网页应把修饰键动作做成显式范围和状态选择，保留这套数据语义。

拖放只取首个文件，文件不得超过 65536 字节，且必须恰好等于目标块的 Raw.Length；导入替换该块后重载控件，再在整窗 Save 时保存所有组。取消不复制修改，保存才 `Origin.CopyChangesFrom(SAV)`。实现须保留导入／行编辑／拥有操作的顺序和完整冻结输出，不用局部字段修改替代整窗规范化。本段尚无产品接线、工程或浏览器验收证据。

Fashion9Editing／Session 已接 API 134 的四种 JSExport／Worker 请求和三语悬浮入口。组元数据不生成全行 JSON，单页最多 200 行；完整保存仍覆盖所有组和物理行。行草稿先保留文本与来源复选项，导入覆盖目标块并重载，拥有操作只保存目标服装组后调用 Core，最后整窗保存全部组。普通保存无效编号按源设为 None，并在冻结预览报告；保留尾部及未开放 Flags。原版直接消费 Raw，不能凭元数据类型更换或伪造块；缺失任何来源组拒绝编辑。

512 个有序操作、8 Mi 字符 JSON 请求、32767 字符编号／过滤和最多 200 条分页是当前接口边界，其中操作数／请求大小／分页／新增编号过滤为浏览器资源或导航功能，不能当作原版枚举范围。Core 写回后回读验证版本、修订、文件长度、全部块元数据与 bytes；预览冻结完整输出、逐行和逐块对照及实际源文件差异，旧令牌、重复、替换、失败和取消保护原件。初稿、扩大、分页、JSON 及 API 134 九种类型化版本／修订专项通过，含独立全文件预期、整数输入、尾部变化、camelCase／可空标记及失败 Open 清旧令牌。六项领域与三文件 46 项接线专项、新增文件 Lint、完整原生和完整 verify 已通过：265 文件／1132 项、类型。最新 API 134 核心发布、裁剪后 26 类属性签名／访问器与最新网页打包通过，网页／PWA 253 项预缓存。保留既有 Hook、裁剪和构建提示；外部 Chrome 仍通信失败，不作页面或真实存档验收。

界面使用分组选择与主表格内部滚动，输入／共享 Select 保持 44px，标签 15px、正文 14px、辅助文字 13px。跨页／跨组草稿先按分组收集，在导入或拥有操作前加入有序队列；所有操作先冻结完整预览，返回编辑后以 Core 变化行显示已排队结果，再叠加后续字段草稿。筛选明确使用已载入存档的编号，不以尚未应用的值替代查询源。可定位全部物理槽、导入首个精确大小文件、显示完整变化记录和尾部／元数据块对照，并下载预览 JSON。取消／关闭释放缓存，迟到读取不覆盖新页，语言变化保留票据；确认后沿用原件、20 步／64 MiB 撤销和导出。

## 朱／紫团体战窗口（普通 API 135、七星 API 136 工程通过）

2026-10-11 已读取 `SAV_Raid9.cs`／Designer、`SAV_RaidSevenStar9.cs`、Core `RaidSpawnList9.cs`、`RaidSevenStar9.cs`、`SaveBlockAccessor9SV.cs` 与 `ValueTypeTypeConverter.cs`。普通与七星窗口是独立模型，不套用剑／盾结构。

- 普通窗口按 Core CountUsed 显示：帕底亚 72、北上 100、蓝莓学园 80。帕底亚使用 `CAAC8800`，前 16 字节为今日／明日 UInt64 Seed；两个 TextBox 最大 16 字符、大写显示、按纯十六进制校验，空白／非法文本 Undo，不写零。北上与蓝莓实际共用 `100B93DA` 的两个 `0xC80` 字节切片；蓝莓从 `+0xC80` 开始，不能误用声明但此构造器未使用的 `0C62D416`。两个切片各有 100 个物理记录，蓝莓窗口只开放前 80 个，尾部须保留。缺失 DLC 块时 Core 提供空 fake 内存，但 CountUsed 仍保留，后续入口必须核验真实可用长度，不在生产补块。
- 每条 32 字节，IsEnabled UInt32 `+0`、AreaID `+4`、LotteryGroup `+8`、SpawnPointID `+C`、Seed `+10`、Unused `+14`、Content UInt32 枚举 `+18`、IsClaimedLeaguePoints UInt32 `+1C`。两个布尔 getter 为非零，setter 写 0／1；源 PropertyGrid 只在属性编辑时调用 setter，不能整窗规范化未改的非标准布尔编码。ScenePointName 为派生只读字符串。普通 UInt32 字段使用原版转换器完整范围；Seed 使用 TypeConverterU32，以八位大写十六进制显示，允许开头 `0x`／`0X`，不预先 Trim，无法解析返回 0，不能统一改成十进制解析或拒绝路径。枚举转换与 PropertyGrid 实际文本上限仍须后续探针核验。
- Propagate 只遍历该区域 CountUsed，跳过目标 AreaID=0，复制启用／内容／已领取联盟支付点三项；仅 `ModifierKeys == Keys.Shift` 时额外复制 Seed。不复制位置、LotteryGroup、Unused 或区域的两项 UInt64 Seed。网页应提供显式“包含 Seed”选择，以 Core 执行完整传播并冻结输出。
- 七星捕获块 `8B14392F`，每条 8 字节，UInt32 Identifier `+0`、Captured byte `+4`、旧版 Defeated byte `+5`，其余保留；新版击败块 `A4BA4848` 前四字节头部保留，每条八字节，Identifier `+0`、Defeated byte `+4`。两个 Bool getter 恰好等于 1，不能套普通团体战的非零语义。CountAll 来自捕获块；新版 GetRaid 按相同索引关联击败记录，Identifier setter 同时写两块；击败块缺失时回落到捕获记录 `+5`，不得新建块或把旧版字段清零。

两个窗口 Save 均先 `Origin.CopyChangesFrom(SAV)`，再 ValidateChildren／Validate。区域 Seed 有 Validated 事件，焦点验证与保存顺序见下方实际流程探针，不能假定 Save 会把未验证文本自动写回。来源核对与工程检查不作为真实页面／存档验收。

独立控件探针 54990 使用已编译只读 Core 与 .NET 10 WinForms，在内存中创建同类型 PropertyGrid，退出码 0。实际 `GridViewTextBox.MaxLength=32767`；ScenePointName 为只读，Seed 的描述器转换器确为 TypeConverterU32。`0xFFFFFFFF`／`ffffffff` 得 UInt32 最大值，` 0x1` 得 0，`0x 1` 得 1，空／invalid 得 0，确认不能提前 Trim 或套区域 Seed 的 Undo 规则。

Content 描述器为 EnumConverter，标准值 Base05／Black6／Distribution／Might7，`GetStandardValuesExclusive=true`；普通 UI 应按标准选项呈现并保留已载入的未知值。底层转换实测仍接受 `123`、`4294967295` 和 `Base05, Black6`（结果 1），`-1` 抛 FormatException，不能把转换器本身描述成只有四项的数值范围。区域 TextBox 的焦点验证与复制顺序尚未完成实际探针；这些元数据及转换结果是工程来源证据，不是新产品接线或验收。

种子流程探针 79197 直接编译只读上游 SAV_Raid9.cs／Designer，使用 Core 生成的类型化工程数据，仅替代图标／翻译／提示依赖；未显示窗口。实际控件 MaxLength=16、CharacterCasing=Upper。手动触发真实 Validated 事件后，合法值写入内部克隆、原件不变，空／非法值不写；Save 复制已验证值。直接调用真实 Save handler、没有提前验证的场景中，Origin 保持旧值，而后续 ValidateChildren 把新文本写入内部克隆，确认复制发生在后续验证之前。这证明事件及复制的数据顺序，未把隐藏表单的调用等同于用户鼠标／键盘焦点验收。

普通团体战核心与三语入口已接，七星实现见下方。Raid9Editing 使用 Core 的三区域与 Propagate，不修改源码或以蓝莓声明块替代实际共享切片。只开放窗口 CountUsed，保存保留全部其他区域／尾部／未改的非标准 Bool 和未命名枚举；属性变更使用原版 CLR／自定义转换器，派生场景名只读。区域种子操作只表示已发生的 Validated 事件，不在保存时解析未验证文本。512 个有序操作／8 Mi JSON 是浏览器接口资源限额，属性文本 32767、区域文本 16 按实际控件匹配。

API 135 四种 JSExport／Worker 请求与三语产品入口已接，完整原生与完整 verify 均通过。六种类型化版本／修订专项覆盖三文化区、八属性完整文件字节预期、两种种子语义、传播可选 Seed／空洞／自身规范化、其他区域和蓝莓尾部保护、冻结、原件、JSON 及失败 Open／替换／过期确认。完整前端 266 文件／1137 项通过；最新浏览器核心、26 类裁剪元数据检查及最新网页／PWA 253 项预缓存通过，保留既有警告。工程合成夹具不作为真实存档或页面验收，外部浏览器与真实存档仍待核验。

界面沿用 44px 控件、15px 标签／14px 正文／13px 辅助文字，属性在桌面三列、窄屏两列／一列重排，稀用区域种子和传播操作折叠。区域／记录选择保留跨记录草稿，未命名 Content 先按已载入值显示，普通新选择使用四项源标准值。区域种子按真实 Validated 事件入队，显式验证与失焦读取即时引用；没有验证的文本不会被保存过程隐式解析。Core 返回预览后显示其实际结果，继续编辑保留有序操作，确认才写工作副本。完整区域种子前后、变化记录的全部属性／场景／raw、所有变化块元数据和 bytes 可核对并下载 JSON。取消、关闭及迟到预览释放缓存，语言变化保留票据。

七星控件独立探针 42461 使用真实 SevenStarRaidDetail 与 WinForms PropertyGrid，退出码 0。三项均可编辑：Identifier 为 UInt32Converter，Captured／Defeated 为 BooleanConverter 且标准选项独占。Identifier 完整范围 0–4294967295，0xFFFFFFFF 同样转换为最大值；空、−1、4294967296 都抛 ArgumentException，不得套记录 Seed 的非法归零规则。编辑器 MaxLength 实测 32767，不因描述中的配信日期将 Identifier 收窄为日期。

探针以真实 Core setters 验证非标准字节 2 读取为 false；Identifier 同时写捕获和新版击败记录，新版 Defeated 只写击败记录 +4，保留捕获 +5；缺失新版记录时写捕获 +5。其余填充 bytes 保留。探针只作为来源证据，不作产品与真实存档验收。

七星 API 136 已接四种 JSExport／Worker、三语悬浮入口和独立表单。真实 CountAll 来自捕获块长度除以八，不硬编码 3000；当前 BlankBlocks9 默认捕获／击败长度为 0x5DC0／0x5DC4，均对应 3000 条。每页 1–200 行是浏览器资源范围，标识符搜索遍历全部物理记录，编号定位与跨页草稿保留。新版关联记录不足时，该捕获记录仍可读取，但击败状态为空并禁用编辑；只在击败块缺失或 Type=None 时采用 Core 的旧版回落，不补造数据。

三个属性仅在用户修改时调用 Core setter。Identifier 以实际 UInt32Converter 按活动语言文化区转换，范围 0–4294967295，支持十进制和 0x；空／非法／越界拒绝，不套普通记录 Seed 的归零规则。两项布尔通过标准选择显示，未修改的非标准字节保持原样；PropertyGrid 文本上限 32767 按源探针匹配。32768 条有序变更、8 Mi JSON、128 Ki 分页 JSON 是接口资源限制，不是原版属性范围。

冻结预览保留完整文件、源／目标哈希、全部变化记录三个属性及关联标识符／两段 raw、所有变化块头及完整 bytes。确认只提交缓存一次，返回编辑保留 Core 结果与有序变更，取消／关闭／失败／迟到结果释放缓存；原件、工作副本撤销及导出沿用统一机制。12 组类型化版本／修订／新旧布局原生专项通过，包含独立完整文件字节对照、3000 条及尾部保护、Bool=1、三个文化区、分页／搜索、UInt32 边界与冻结拒绝；完整原生和完整 verify 均通过，267 文件／1142 项测试通过。API 136 最新核心、26 类裁剪元数据和最新网页／PWA 253 项预缓存通过，保留既有警告。工程夹具不作为真实存档或页面验收，外部浏览器与真实存档仍待核验。

## 剑／盾训练家窗口（API 131，工程检查通过）

已核对 `SAV_Trainer8.cs`／Designer、`TrainerCard8.cs`、`TitleScreen8.cs`、`MyStatus8.cs`、`FashionUnlock8.cs`、`PlayerSkinColor8.cs`、`Coordinates8.cs`、`PlayTime7b.cs`、`Epoch1900DateTimeValue.cs`、`Records.cs` 与 `TrainerStat.cs`。API 131 已接悬浮面板专属三语入口、独立 Worker 与冻结预览，工程检查通过；页面／真实存档仍待所有者验收。

界面分为概览／联盟卡／训练家 ID／地图／记录／联盟卡队伍／标题画面队伍／外观与服装／姓名字节。两队伍各六格本地图片，全部来源属性和原始记录可读写；长期字段分组，记录可搜索并内部滚动，控件保持 44px、标签 15px、正文 14px、说明 13px。姓名特殊字符、清理／层叠／完整字节操作及两名称目标齐备。所有修改需先预览，按源／目标完整哈希冻结后应用现有工作副本，原件、20 步／64 MiB 撤销与导出保留。

预览展示字段、ID、八位置值、实际保存日期、18 项外观标识、双队伍名称／图像／属性／原始记录，以及所有变化数据块的键／类型／原始数据。布尔块即使数据长度零，也展示 Bool1／Bool2 类型变化，不能遗漏地鼠标记。服装清理范围、累计记录与原版保存的附带变化均进入预览；全部图片复用本地许可资源，无运行时 CDN。

- 联盟卡块 `874DA6FA`，六条记录从 `0xC8` 开始，各 `0x1C`；标题画面块 `E9BE28BF`，六条记录从零开始，各 `0x28`。缺失或不足长度拒绝，不补零块。
- 两类 PropertyGrid 均开放 Species UInt16、Form／Gender Byte、IsShiny Boolean、EncryptionConstant UInt32 与 FormArgument Int32；卡片还有 Unknown UInt32，标题还有 Unknown18／1C／20／24 UInt32。限制按 CLR 类型完整范围，不收窄成游戏物种、形态或性别枚举。文本沿 PropertyGrid 默认 32767 字符，使用具体 .NET 数字／布尔 TypeConverter 与明确文化区；数字转换器也接受原版支持的 `0x` 写法，不能仅按十进制文本推断。无效值拒绝，并先完整解析请求，避免后项失败留下前项写入。
- Species／Form／Gender setter 重写四字节整数并清上部字节；IsShiny 只写 `+0xC`，不覆盖后三字节。卡片 EC／Unknown／FormArgument 位于 `+0x10／14／18`，标题 EC／FormArgument／四未知字段位于 `+0x10／14／18／1C／20／24`。读取提供逐条原始 bytes、三语物种名和既有本地 SpriteName 资源键，未知物种保留原 ID。
- 原版队伍复制调用 `SetPartyData`：已占用槽只改六项已知字段，保留未知字段；甜冷美后的形态参数来自 IFormArgument，其余设为 −1；剩余槽清空整条记录。图像命名按该窗口原版调用，SpriteName 的 formarg 参数固定零，存档实际 FormArgument 独立保留。

训练家核心新增 71 项字段（源最后保存控件能加载时），含 50 条训练家记录。记录上限取 `max(当前值, GetRecordMax)`，只改变化的记录；两个对战塔胜场字段另同步记录 47／48，连胜掩码三位但保存上限 300。金钱／瓦特七位、联盟卡 ID 六位、越野赛五位；越野赛同步 `38548020`，瓦特大于累计值时更新记录 22。BP 0–9999，加载采用 min，空 NumericUpDown 沿用已加载值；小时五位／UInt16，空值因原版 ushort.Parse 无处理而拒绝；分秒两位，Change255 将空输入改为零，保存模 60。训练家及联盟卡姓名各最多 12 UTF-16 字符、各 26 字节；姓名不变时保留废字节。号码 TextBox 12 字符，但 status `+1` 与 card `+0x39` 只写前三个字符的低字节并补零。

位置块 `16AAA7FA`：地图 UInt64 在 `+0x6000`，十进制字符串／decimal 处理，禁止网页 Number 截断。X／Z／Y 在 `+0x10／14／18`，SX／SZ／SY 在 `+0x20／24／28`，RX／RZ／RY／RW 在 `+0x30／34／38／3C`。八控件全部绑定 ChangeMapValue，原版没有 Loading guard；地图也为 NumericUpDown，不能套用 PLA 的地图 TextBox 规则。全零加载且数值不变时不写入；非零加载或任何数值变化时重写整组，RX／RY 置零，RZ／RW 为半角 sin／cos。异常旧坐标禁用，空／无效文本保留旧数值。

开始日期位于联盟卡 `+0x170／172／173`，日期控件 2000–2060，没有时间。最后保存位于 `8CBBFD90 +4` 四字节 Epoch1900 位编码，未存秒且不转换时区。最后保存日期控件默认最小 1753、最大 4095-12-31 00:00，时间控件 2000-01-01–2060-12-31 00:00；两 Designer.Value 都是 2000-01-01。实际 WinForms 控件探针确认：加载 2061-02-03 04:05 时日期保留、时间归零；4095-12-31 23:59 第一项加载失败，重保存为 2000-01-01；1900-01-01 12:34 日期保留、时间归零。控件隐藏后原版 Save 仍按 HasValue 回写，因此重保存必须显示这个附带变化；内部目录额外提供实际 SavedValue，不把异常旧值提前改掉。无效日历返回 null 不创建日期；有效日历但异常时钟导致原版加载异常，重保存拒绝。

肤色八项来源 PlayerSkinColor8，修改同时写 Skin／MomSkin；性别改变采用 `(原肤色索引 & ~1) | 性别` 重置所有外观，保留其他 status 字节。三服装模式按源先 Clear，再 Reset／UnlockAllLegal／UnlockAll；Clear 只清服装区域，不清前六类区域。地鼠只在 DLC 修订且全部来源命名布尔块和 UInt32 计数块完整时开放，写入继续调用原版 UnlockAllDiglett，不创建缺失生产块。空白模板缺少某些命名块，专项夹具只为明确来源字段增加类型化工程数据，不补造 SaveUtil 长度或降低检测。

六组队伍与十二组训练家组合专项通过，完整原生最终退出码 0。扩大覆盖隐藏控件日期、缺失地鼠块、空值、全零地图、双队伍动作及布尔类型变化预览。夹具曾漏写图片资源下划线、地图 UI 语言，布尔专项曾误假定空白模板具有 Bool1／Bool2；均按真实来源修正，不在生产创建缺失块。类型首轮测试元数据 decimals 改为既有 places；控制字符校验改用字符编码范围，不关闭 Lint 规则。完整前端 262 文件／1111 项、全仓 Lint、最终类型、API 131 浏览器核心、裁剪后 26 类属性和网页／PWA 打包通过，预缓存 252 项。既有 Hook、反射裁剪与包大小警告保留。最后文档格式收尾；Chrome 仍返回 nodeRepl.fetch request failed，页面及真实存档尚未验收，整体 PKHeX 库存继续推进。

## 传说 阿尔宙斯训练家窗口（API 130，工程检查通过）

已核对 PKHeX 26.08.26 `SAV_Trainer8a.cs`／Designer、`MyStatus8a.cs`、`Coordinates8a.cs`、`SaveBlockAccessor8LA.cs`、`SAV8LA.cs`、`Epoch1970Value.cs`、`Epoch1900DateTimeValue.cs` 与共用姓名 TrashEditor。API 130 已接独立三语窗口及 Worker，按概览／ID／地图／姓名字节分组，所有操作先冻结预览，再进入工作副本，保留原件与既有撤销／导出。

- 13 项字段：姓名、金钱、性别、语言、时长三项、开始／最后保存日期、当前／累计功勋、调查队等级、腰包次数。姓名最多 12 UTF-16 字符，七位金钱最大 9999999，五位小时最大 65535，分秒两位并模 60。四项 NumericUpDown 均 0–999999999，加载采用 `min(raw, maximum)`，整窗保存会将超限 UInt32 回写为此上限；不得按游戏注释的 rank 10／satchel 39 人为收窄。
- MyStatus 块键 `F25C070E`，ID32 `+0x10`、性别 `+0x15`、语言 `+0x17`、姓名 `+0x20` 共 26 字节。修改语言同时更新 `0BFDEBA1`，语言编号至少 6 时运行时编号减一。六位 TID／四位 SID、空值及回绕沿用 TrainerIDManager；该窗口没有 BDSP 的全零 ID 修复。
- 坐标块 `267DD9DA`，地图为 `+0x08` 长 0x48 的 ASCII 缓冲，但 TextBox 最大 48 字符；非 ASCII 源 setter 写问号，清缓冲后复制。X／Z／Y `+0x50／54／58`，四元数 RX／RZ／RY／RW `+0x60／64／68／6C`；数值范围正负 99999999，六位小数。地图 TextBox 未绑定 ChangeMapValue，但源窗口没有 Loading guard。加载值全部为零时单改地图不保存；加载非零值或数值实际改变会重写完整位置、地图及四元数，RX／RY 置零，RZ／RW 为半角 sin／cos。空／无效数值保留旧值；异常旧坐标禁用整组，不先归零。
- 日期范围 2000–2099，来源为无时区 DateTime。开始块 `AEE903A2` 是 UInt64 自 1970 起的秒；最后保存 `1B1E3D8B` 是年／月／日／时／分位打包，块大于四字节才保存秒。网页须保持原有墙钟时间，不套用 BDSP 的时区换算。记录真实原始 bytes，冻结完整来源／目标哈希及逐块重读取检查，不修改无关块、元数据或原件。

初稿核心编译及既有裁剪元数据探针、前端领域 4 项专项与原生四组合类型化合成块专项通过。接 UI 时再核对原版无 Loading guard：载入非零数值会触发 MapUpdated，原版重保存需同步重写地图、位置与四元数；扩大四组合专项已通过。字段、ID、坐标、姓名字节、两日期原始编码及忽略输入均进入三语预览；特殊字符、清理／层叠／完整原始字节和最大金钱操作齐备。合成数据不构成生产 SaveUtil／真实存档验收，不补造长度或放宽识别。前端三文件专项 40 项与最终完整 261 文件／1103 项通过；首轮日期子进程单项超过 5 秒，三文件 19 项复查及低负载完整重跑通过，代码与超时未改。全仓格式、Lint、类型、API 130 核心、裁剪后 26 类属性及最新核心网页／PWA 打包通过，预缓存 252 项。既有 Hook 与反射裁剪警告保留，页面／真实存档未验收。

## 晶灿钻石／明亮珍珠训练家窗口（API 129，工程检查通过）

已核对 PKHeX 26.08.26 `SAV_Trainer8b.cs`／Designer、`TrainerIDManager`、`TrainerStat.cs`、`MyStatus8b.cs`、`SystemData8b.cs`、`Record8b.cs`、`RecordAddData8b.cs`、`PlayTime8b.cs`、`SAV8BS.cs` 与共用姓名 TrashEditor。API 129 已接专属三语产品入口与 Worker，按概览／ID／地图／徽章／记录／姓名字节分组，不把原有基础训练家面板视为整个窗口完成。

- 姓名／劲敌名最多 12 字符，普通保存仅改变化的文字以保留原有废字节；两缓冲各 26 字节，位于 `0x79BB4`／`0x55F4`，共用已有精确 TrashEditor 编码／清理／层叠能力。六位十进制 TID 与四位 SID 使用来源先 SID 后 TID 的规则；任意保存后 ID32 为零即设 SID16=1。
- 新增 50 项字段元数据：两姓名、游戏／性别／语言／金钱、BP、三项游戏时长、两时间、八徽章及 30 训练家记录。金钱掩码七位但 MyStatus8b setter 最大 999999；BP 0–9999，小时五位／0–65535，分秒两位并按 60 取余。记录上限按 `max(当前读取值, GetRecordMax)`，非零号 setter 总上限 999999；未改记录不通过整窗保存附带重写。
- 时间日期范围 2000-01-01–2099-12-31。SystemData 存 UTC FILETIME，开始／最后保存的 Int64 地址是 `0x95DAC+4／+16`，记录时间可传显式时区偏移，保留原值不足一秒的 ticks，计数／惩罚／每日／快照不改。网页日期需要按用户本地时区显示和发送，不能依赖 Worker 内 .NET 默认时区。
- 地图 0–1000，X／高度／Y／朝向为正负 99999999；X／高度零小数显示、Y／朝向五位小数，保存 X／Y 显式转 Int32。ZoneID 在 `0x5634`；位置在 status `+0x40／44／48／4C`。任一真实坐标值改变时按源写全部五项；异常旧值加载失败时禁用，不能先归零。
- 1.1 及以后具有 `0xE9828` 扩展排行块，共 12 条各 0x30 加 12×32 标记。姓名或 ID 改变，仅同步原姓名与 ID32 都匹配且姓名非空白的记录；匹配记录姓名按 ClearZero 重写，保留语言、性别、体型、保留字节及标记区。冻结预览必须展示此附带变化。1.0 无扩展块，不补造。

扩大八组原生专项通过，覆盖两个入口的排行同步、全零 ID、双姓名前缀编码与六位 ID。两文件前端专项 37 项及完整 260 文件／1098 项、全仓格式／Lint／类型通过。首轮 API 129 核心及裁剪后 26 类属性通过，收尾补齐空／无效坐标保留原值后，最新八组专项通过，最新核心构建、裁剪后 26 类属性及网页／PWA 打包通过。普通记录保存只在数值实际改变时写入，复用现有三语记录名称；长记录区内部滚动，预览包括字段、坐标、ID、时间 ticks、姓名及扩展排行全部原始 bytes。浏览器本地日期按零秒补齐，并在原版保存时传显式偏移；未知原值不先归零。首轮界面格式发现 JSX 闭合问题，已修正并格式化。PWA 预缓存 252 项；页面／真实存档仍待所有者验收。

## 剑／盾极巨巢穴参数（API 128，工程检查通过）

已核对 PKHeX 26.08.26 `SAV_Raid8.cs`／Designer、`RaidSpawnList8.cs`／`RaidSpawnDetail`、`SaveBlockAccessor8SWSH.cs`、`SAV8SWSH.cs` 与 `ValueTypeTypeConverter.cs`。源窗口为三个区域的 PropertyGrid，伽勒尔／铠岛／雪原分别显示 100／90／86 个巢穴；其余物理记录不开放编辑，缺失或不足长度的 DLC 块禁用，不创建补零块。

- 三块键为 `9033EB7B`／`158DA896`／`148DA703`，每记录 `0x18` 字节。Hash UInt64 位于 0，Seed UInt64 位于 8，Stars／RandRoll／DenType／Flags 位于 `0x10–0x13`，尾部四字节保留。
- Hash／Seed 使用来源 TypeConverterU64：显示大写 16 位十六进制，可选前导 0x；无效、空或超过 UInt64 归零。网页始终字符串／BigInt，禁止经 Number 截断。Stars／RandRoll／Flags 为 byte 0–255，Description 中星级 0–4、抽签值 1–100 不是 PropertyGrid 输入限制。DenType 是 byte 枚举 0–6，可保存来源允许的原始 byte 值；不把未知旧值变成默认项。
- IsActive 只读；IsRare／IsWishingPiece／WattsHarvested／IsEvent 可编辑。DenType 和派生 setter 会同步事件 bit 1，WattsHarvested 仅改 bit 0，其他 Flags 位保留。CommonWish 允许活动标记，Event=false 可将 Event 类型变成 Common。多个修改必须保持源 PropertyGrid 的应用顺序，不能以无序对象覆盖联动。
- 产品按地区／巢穴／属性选择，每次追加一项到有序修改序列后预览，可撤回上一项、丢弃或冻结应用，支持空序列原版保存。当前记录显示全部一般／派生状态及原始 bytes，原件、工作副本、撤销／导出保留。冻结完整来源／目标哈希，导出以已确认类型回读加密块并逐块核对键、类型、子类型和数据；生产入口仍采用 SaveUtil 严格格式检测。

前端专项及六组原生类型化合成块专项通过，最终完整前端 259 文件／1071 项通过。首轮完整运行 C-Gear 数据传输单项超时，三文件复查及低负载完整重跑通过，生产代码与默认超时未改。全仓格式／Lint、最终控件 ESLint、稳定文件类型检查、API 128 核心构建／裁剪后 26 类属性及最新核心网页／PWA 打包通过。类型检查曾发现共享 Select 接口及前后标签问题，已修正并重跑通过。合成文件只证明工程数据语义，不放宽生产 SaveUtil；页面与真实存档未验收。

## 晶灿钻石／明亮珍珠地下物品（API 127，工程检查通过）

来源为 PKHeX 26.08.26 `SAV_Underground8b.cs`／Designer、`UndergroundItemList8b.cs`、`UndergroundItem8b.cs`、`UgItemUtil.cs`／`UgItemType.cs`、`SAV8BS.cs` 与 `text_ug_item` 三语资源。窗口负责地下物品库存，并非地下 NPC 或遭遇数据。产品显示真实物品 ID、来源类型、本地名称、数量、新获得及收藏；来源类型 None 的记录不开放编辑。

- 块地址 `0x111BC`，999 条，每条 12 字节，共 `0x2ED4`。偏移 0 是 Int32 数量，偏移 4 是 UInt32 HideNew，偏移 8 是 UInt32 Favorite；两标记仅原值 1 为真。“新获得”与 HideNew 反向，不能直接保存复选框值。
- 源 DataGridView 普通文本数量列没有最大字符数、非负限制或最大值钳制；保存以 `int.TryParse` 解析十进制 Int32，空值／无效／溢出归零。领域复用已核对的 Int32 文本解析，Worker 强制精确整数。单项允许负数和超过批量最大值，不新增跨字段约束。
- 全部仅将可见条目数量设为来源 MaxValue：Sphere／Item 999，Statue／Pedestal 99；新获得和收藏维持当前草稿。清空将可见数量归零、新获得设真、收藏设假。先应用当前草稿，再执行批量，支持原版保存。
- `WriteItems` 重写全部 999 条，两标记连隐藏记录也规范为 0／1；隐藏数量保留。冻结预览展示可见数量及两个原始标记，并提供所有 ID 的规范化变化。应用校验来源／目标完整哈希，导出回读检查格式／版本／布局／完整数据／校验，原件及既有撤销保持。

BD／SP × 四布局八组合原生独立地址专项通过，确认 631 个可见物品、999 条物理记录及四种类型最大值；覆盖 Int32 极值、草稿与全部／清空、双标记及隐藏规范化、完整导出、精确变化地址和冻结／校验拒绝。完整前端 258 文件／1066 项通过，包含地下物品 Worker 路由；全仓格式、Lint、类型、API 127 核心构建、裁剪后 26 类属性及最新核心网页／PWA 打包通过，预缓存 252 项。原有 Gen3StaticPanel Hook 与反射裁剪警告保留；本轮外部 Chrome 读取超时，页面与真实存档未验收。

## 晶灿钻石／明亮珍珠贴纸（API 126，工程检查通过）

已核对 PKHeX 26.08.26 `SAV_SealStickers8b.cs`／Designer、`SealList8b.cs`、`SealSticker8b.cs`、`SAV8BS.cs` 及 `text_stickers` 三语资源。产品入口位于存档悬浮面板，支持名称／ID 搜索、当前数量、累计数量、已取得、全部、清空、原版保存、冻结预览、工作副本与既有撤销／导出。

- 物理记录 200 条，块地址 `0x93E0C`，块长 `0x960`；每条 12 字节，偏移 0 为 UInt32 取得标记，偏移 4／8 为 Int32 当前／累计数量。取得仅原值 1 为真。来源语言表有 97 项，第 0 项空白，显示 1–96；隐藏条目的数量仍保留。
- 源 DataGridView 为普通文本列，没有 0–99 限制、最大字符数或两列大小约束。保存使用十进制 `int.TryParse`，允许正负号及外侧空白，空值、无效和超过 Int32 范围均归零。网页文本输入和领域解析按此处理，不使用 HTML number 隐式规范化；Worker 请求只接受精确 Int32 数值。
- 全部对显示条目执行 `count += 99 - total; total = 99; obtained = true`，沿用未检查 Int32 回绕。清空将显示条目两数量归零并取消取得。批量动作先读当前草稿；不得忽略已输入的数据或把当前数量直接设为 99。
- 来源保存调用 `WriteItems` 写全部 200 条，隐藏记录的取得值也规范为 0／1。预览展示显示条目三字段及全部取得原值变化，包括隐藏 ID；不以保护未知值为由遗漏源窗口附带行为。来源原始 bytes 不改变，导出重新读取并检查类型、版本、布局、校验及完整数据，冻结绑定完整来源／目标哈希。

原生 BD／SP × 四布局整文件独立地址专项通过，包含全 Int32 极值／回绕、草稿与批量、隐藏取得标记、完整来源／目标绑定、精确变化地址、导出与原件保护。完整前端 257 文件／1061 项、全仓格式、完整 Lint 重跑、API 126 核心构建、裁剪后 26 类属性及最新核心网页／PWA 打包通过；类型检查通过。首轮 Lint 曾报告 JSX 解析错误，当前文件闭合标签及专项复查通过，完整重跑零错误；原有 Hook 和裁剪警告保留。外部 Chrome 读取超时，浏览器与真实存档仍待验收。

## 晶灿钻石／明亮珍珠杂项（API 125）

来源为 PKHeX 26.08.26 `SAV_Misc8b.cs`／Designer、`EventUnlocker8b.cs`、`BattleTrainerStatus8b.cs`、`FlagWork8b.cs`、`UgSaveData8b.cs`、`EncounterSave8b.cs`、`MyItem8b.cs`、`InventoryItem8b.cs` 及 `SAV8BS.cs`。源窗口没有数值输入，完整接入十项按钮：花岩怪 NPC、谢米／达克莱伊／阿尔宙斯、帝牙卢卡／帕路奇亚、两只游走、707 位训练家重置／击败、所有区域、所有时装。操作和提示使用中英日三语，中文操作名沿用 PKHeX 资源。

- 花岩怪以 100 字节 NPC 数组中非零项计数，重复值也计入；少于 32 才启用。执行仅把前 32 项写成 1–32，保留后 68 项。地址为 `0x9A89C + 0x273C`。
- 捕获标记 308 为 1 且 work 84 不等于 5 才能重置箱子封面传说；写 work 84=5，清标记 308／393／1623。两只游走任一状态非零即启用，执行同时重置两只，清标记 249／420／245／532；只修改 `0x8F97C + 0x158／0x178` 状态字节，保留种类、种子、位置及其他数据。
- 谢米写 work 276=1、道具 452 数量 1、全国图鉴及系统标记 5，并清标记 545；达克莱伊写 work 275=1、道具 454 数量 1、全国图鉴，并清标记 301；阿尔宙斯写 work 188=0、道具 455 数量 1、全国图鉴、系统标记 5、标记 1508，并清 244／531。启用条件逐项对应源窗口，既有原始非标准值不先规范化。
- 区域解锁写系统标记 134–757 共 624 项，以及 work 278／279／280／281／291／292；时装解锁写标记 1246–1257 共 12 项。两项再次打开仍可执行，允许零变化预览，不伪造持久禁用状态。
- 训练家块在 `0x7D3E0`，707 项，每项 8 字节：win 和 searcher 各 UInt32。击败写 1／0，重置写 0／1；启用判断沿用源 `win == 1` 语义，并显示源窗口通关后使用的提示。
- work 从绝对 4 开始，普通标记从 `0x7D4`、系统标记从 `0x4654` 开始，均为四字节原值；全国图鉴在 `0x7A328 + 0x30B4`。道具在 `0x563C + id × 16`，不能只改数量：Core 同步 seen／favorite／padding，sort 为零时分配背包内最大合法序号加一，沿用 UInt16 回绕。

产品入口在存档悬浮面板，提供可用操作、分组搜索原始状态、冻结预览及实际变化表。每次应用校验完整来源与目标哈希，拒绝过期、未冻结、不支持或校验失败的存档；所有变更进入工作副本，沿用撤销与导出。只读记录包含原始标记／work、NPC bytes、三种事件道具的完整记录、训练家块摘要，不将未知值误显示成标准布尔值。

BD／SP × 1.0／1.1／1.2／1.3 八组原生专项通过，使用独立原始地址构造整文件预期，覆盖十项效果、重复及不可用操作、原件保护、冻结与校验拒绝。前端专项 35 项及完整 256 文件／1055 项测试通过；全仓格式、Lint、类型、API 125 核心构建、裁剪后 26 类属性及最新核心网页／PWA 打包通过。外部 Chrome 读取及打开授权本地页面均超时，页面与真实存档未验收。

## 第三世代殿堂记录

2026-09-30 已核对 WinForms/Subforms/Save Editors/Gen3/SAV_HallOfFame3.cs、其 Designer，以及 Core Saves/Substructures/Gen3/HallFame3.cs、SAV3.cs、Util.cs、StringConverter3.cs 和 Legal.cs。API 87 已开放产品入口。

- RS／E／FRLG 的殿堂由 50 队、每队 6 格组成，每格 0x14 字节，实际记录共 6000 字节。GetHallOfFameData 合并 0x1C000 与 0x1D000 两扇区各 0xF80 字节，结果 7936 字节；剩余 1936 字节及扇区尾部元数据不能作为空白丢弃。
- 只允许完整存档访问扩展扇区；SAV3.IsFullSaveFile 判断长度至少 0x20000。半长存档需要返回不可用，不补零。额外扇区校验位于各扇区偏移 0xFF4，按前 0xF80 字节计算；全部由 0／FF 构成的未初始化扇区按 Core 规则处理。
- 每格偏移 0／2 为小端 UInt16 TID／SID，偏移 4 为小端 UInt32 PID；偏移 8 的低 9 位为第三世代内部种类编号，高 7 位为等级。全国种类上限由 SAV3.MaxSpeciesID／Legal.MaxSpeciesID_3 确认为 386；种类零不等同于清空其他字段。
- TID／SID 为五位十进制 MaskedTextBox，ValidateIDs 清理非数字、空值视为零、超过 65535 归到 65535。PID 输入最多 8 字符，Util.GetHexValue 跳过非十六进制字符、空值为零，显示规范化为大写 8 位；网页需保留其进制、空值和规范化行为。
- 等级控件默认最小 0、最大 255，但 HallFame3PKM.Level setter 使用 Math.Min(100, value)。网页需明确超过 100 的新输入按 100 保存，不能套用第一世代的原值写入规则；没有编辑的非标准旧等级应保留。
- 昵称在格内偏移 10，占 10 字节；日文与国际版输入均最多 10 字符。修改时使用 ClearZero，再由 StringConverter3 写入结束符；未改昵称保留原始字节。另有原始昵称字节编辑入口，网页应提供精确 20 位十六进制模式并检查文字编码回读。
- 异色为不可编辑指示器，根据 ID32／PID 计算；未知图腾形态由 PID 派生，代欧奇希斯形态由游戏版本派生（FR 攻击、LG 防御、E 速度，其他普通）。图像和状态应复用 Core 的派生结果。
- 清空只针对当前成员，将 TID、SID、PID、等级、种类与昵称清零／清空；昵称已经为空时仍需保留其残留字节。没有第一世代的整队删除前移、计数编辑或满队登记滚动操作，不能直接复用。
- 导入当前队伍覆盖所选记录：先取得实际队伍成员，再用空 PK3 补齐 6 格，逐格 CopyFrom。按住 Shift 会覆盖全部 50 队；网页应提供明确的当前／全部范围，避免依赖隐藏键盘操作。

实现需保留完整 7936 字节合并区域，修改后通过 SetHallOfFameData 写回并重算校验。HallFame3Entry.GetEntries 的 Raw 切片包含后续数据，不能把每个 Entry.Data 的长度误当成 120 字节。
后续验证覆盖所有 300 格、跨扇区成员、两种字符集、TID／SID／PID 规范化、等级 0／100／101／127／255、未知图腾与代欧奇希斯形态、异色边界、当前／全记录队伍导入、残留字节、未初始化扇区、半长文件拒绝、原件与完整导出。

API 87 已接入核心、Worker 与中／英／日三语入口。50 队六格预览使用本地图像，形态由 Core 按 PID／显示版本派生；可编辑种类、等级、训练家 ID、隐藏 ID、个性值、昵称文字与原始字节，支持清空成员和当前／全部范围的队伍导入。
草稿未应用时禁止切换记录／成员／显示版本及执行导入；应用进入既有工作副本、撤销与导出流程。显示版本不改写存档游戏。
核心及公开 API 六种区域／游戏布局专项已通过；前端 4 项专项、完整原生、浏览器核心构建、26 类型裁剪检查和完整 verify 已通过，详细证据见进度。Chrome 连接可列出页面但读取仍超时，浏览器与真实存档未验收。

## 第三世代游走宝可梦

已核对上游 SAV_Roamer3.cs／Designer、Core Roamer3.cs、三个 SaveBlock3Large 实现和 Util.cs。
API 88 已增加独立第三世代游走入口；保留 XY 原有三鸟种类、0–4 状态和遭遇次数模型。

- 数据在解包后的 LargeBlock：RS 0x3144、E 0x31DC、FRLG 0x30D0；RoamerData 长 0x14，尾随 8 字节未用数据及其他区域必须保留。
- 偏移 0 为 IV32，偏移 4 为 PID，偏移 8 为内部种类 UInt16，偏移 10 为当前 HP UInt16，偏移 12 为等级，偏移 0x13 为激活标记。种类通过 SpeciesConverter 转换，全国上限 386。
- PID 文本最多 8 位十六进制；保存时 Util.GetHexValue 跳过非十六进制字符、空值为零。异色只读，使用当前存档训练家 ID 和 Core Roamer3.IsShiny，阈值小于 8。
- 六个个体值输入为 MaskedTextBox，Mask 为 00，允许两位十进制 0–99；Util.ToInt32 空值为零，Core setter 将大于 31 的值限为 31。UI 与 API 应接受该输入范围并明确保存上限，不允许负数或超过两位；设置个体值时保留 IV32 最高两位。
- 等级 NumericUpDown 未覆盖默认最小 0／最大 100；HP 最小 0，显式最大 65535。读取等级时上游以 Math.Min 钳到控件最大值，网页需区分原始等级与编辑输入，未改异常原值不应被其他字段修改覆盖。
- 激活条件严格为原始字节等于 1，写入布尔值对应 0／1；其他原始字节不因只读或无关字段修改而规范化。状态和五项华丽数值位于 0x0D–0x12，当前窗口没有编辑控件，必须保留。
- RS／FRLG 的 IsGlitched 为真，游戏遭遇只加载个体值最低一字节；E 不受此限制。上游窗口编辑完整六项 IV，不能把游戏中的缺陷误当作存储格式并清空其他位。

Roamer3Editing.cs 已提供独立目录、逐字段补丁、保存与回读检查；API 88、Worker、三语入口及本地图像已接入，沿用工作副本、撤销与导出。图像展示已应用数据，异色只读；分别显示存储 IV 与受游戏缺陷影响的遭遇 IV。
核心及公开接口专项已通过国际／日文 RS、E、FRLG 六种布局，覆盖全部字段边界、两种 IV 行为、异常激活／等级原值、未修改位、异色边界、完整文件对照和导出回读。前端 4 项专项与定向 Lint 已通过，完整检查状态见进度；浏览器及真实存档待核验。

## 第三世代装饰品

2026-10-09 核对上游 SAV_Misc3.cs 的 ReadDecorations／SaveDecorationCategory、Designer 八张 DataGridView 和 Core DecorationInventory3.cs／Decoration3.cs／SaveBlock3LargeRS.cs／SaveBlock3LargeE.cs。此功能仅适用 RS／E，不向 FRLG 开放。

装饰品库存共 150 字节，LargeBlock 基址 RS 0x26A0、E 0x2734。桌子、椅子、植物、摆设、地毯、海报、玩偶、坐垫的相对起点依次为 0、10、20、30、60、90、100、140，容量依次为 10、10、10、30、30、10、40、10。
每槽为一个 byte，0 表示空槽；1–120 的合法分类必须使用 DecorationInfo.GetCategory，尤其 111–120 仍为玩偶，不能按连续区间误分到坐垫。三语名称来自 Core decoration3 资源，分类名与操作使用当前界面语言。

上游使用同类 ComboBox 选项，没有自由数值输入；每类均允许空槽、重复物品。保存时按原顺序压缩非空项，空槽置于该类末尾。网页按所选分类应用此规则，其他分类保持原始排列；提供独立整理空槽与清空分类操作，所有操作可撤销。
旧存档中的异常 byte 或错类编号按原始格位显示，只能原样保留或替换，不能新增或移动异常编号。目录不自行修正异常数据；提交前验证分类、精确容量和全部槽位后再一次写入，避免部分修改。

API 89、独立 Worker 路由与三语入口已接入工作副本、撤销和完整导出。导出回读复核游戏、区域、类型、长度、校验和全部 150 字节。专项已通过四种区域／游戏布局、150 格、120 物品分类、稳定压缩、重复与异常值、相邻数据、请求原子性和原件保持。前端专项、完整原生、浏览器核心构建、26 类型裁剪检查及完整 verify 通过；浏览器和真实存档待核验。

## 第三世代绘画

2026-10-09 核对 SAV_Misc3.cs 的 LoadPainting／SavePainting／ValidatePaintingIDs、Designer、RenderedString.cs、Core Paintings3.cs、RS／E 的 LargeBlock 和 StringConverter3。只适用 RS／E。

五幅绘画分别对应帅气、美丽、可爱、聪明、强壮；索引 0–4，启用标记 160–164。相对说明控件 0–2，写入绝对说明为 index * 3 + caption；读取时 Core 把不匹配的原始说明钳到 0–2。网页默认保留原始说明，只有明确选择新说明才重写，避免无关字段修改规范化旧异常数据。
每幅真实长度 0x20，RS 基址 0x2EFC、E 0x2F90。上游 GetPaintingSpan 返回从所选幅起的五幅长度，清空前必须限制为单幅 32 字节；API 90 的独立缓冲区和 SetPainting 仅写 32 字节，保护后续绘画及寄放屋。禁用操作只接受明确的清空请求，并按 Core 规则把该幅清零，再将两个名称首字节设为 FF。

PID 为 UInt32。Designer 没有覆盖 TextBox 默认 MaxLength 32767，Util.GetHexValue 会过滤非十六进制字符并逐位 UInt32 回绕；网页允许同样输入长度，失焦规范化为大写八位十六进制。ValidatePaintingIDs 的十进制显示会被后续十六进制解析重新解释，因此网页直接保留十六进制，避免该上游展示缺陷。
TID／SID 的 Mask 为 00000，空值零、超限钳到 65535。RenderedString 的昵称／训练家姓名未设置 MaxLength，上游 Core setter 截到 10／7 字节；网页将文本限制为可无损保存的 10／7 字符，编码回读不同即拒绝，不静默截断。未修改名称保留全部残留字节；精确编辑可选择 20／14 位十六进制原始区。名称区分别在偏移 0x0B 和 0x16，间隙与尾部仍保留。

API 90、Worker 与三语五幅图像入口已接通。编辑包含启用、种类 0–386、相对说明、训练家 ID／隐藏 ID、个性值、昵称、训练家姓名与两组原始字节；异色只读。未知图腾形态按 PID 派生，绿宝石代欧奇希斯显示速度形态。有草稿时限制切换绘画，提供应用、放弃与关闭清空，沿用撤销和完整导出。
四布局专项、完整原生与公开接口检查已通过，覆盖五幅清空与字段写入、异常说明保持、姓名残留及编码、启用标记、异色、28 种未知图腾形态、相邻绘画和寄放屋、完整文件对照、原件保持与导出回读。前端 4 项专项、API 90 构建、26 类型裁剪检查及完整 verify 通过；浏览器及真实存档待核验。

## 第三世代游戏记录与首通时间

2026-10-09 核对 SAV_Misc3.cs 的 LoadRecords／GetFameTime／SetFameTime、Designer、Core Record3.cs、SAV3.GetRecord／SetRecord、三个 LargeBlock 记录区域和 SmallBlock 安全密钥。只适用 RS／E／FRLG。

RS 记录区位于 LargeBlock 0x1540，共 50 个 UInt32；E 位于 0x159C、FRLG 位于 0x1200，实际各 64 个 UInt32。上游 Record3.GetItems 仅开放 RS 的 0–49 和 E／FRLG 的 0–51，不包含 NUM_GAME_STATS 与未列出的 52–63。API 91 保持同样的编辑范围，导出验证覆盖完整存储区域，保护保留槽。
数值控件显式设置十进制 0–4294967295，网页输入最多 10 位并在 domain 与 Core 桥接同时校验。不得用现有第六世代 int 记录模型缩到 2147483647。RS 的安全密钥固定为零，E／FRLG 使用 SmallBlock 的 UInt32 密钥；读写均经 SAV3.GetRecord／SetRecord，保存值为明文 XOR 密钥。

记录 1 为首次殿堂时间。小时控件 0–9999、分钟和秒 0–59，最小值为 NumericUpDown 默认零；GetFameTime 编码为小时左移 16、分钟左移 8、秒。SetFameTime 读取高 16 位小时与两组低 byte，再钳到控件范围。网页区分原始 UInt32 与显示时间，数值模式可原样保留非标准记录；时分秒模式只有点击应用才重新编码，并提示旧时间超范围。

GameRecords3.cs 已接入公开读取／编辑接口、API 91 Worker 与三语入口，使用编译期 enum 成员名称保持上游名单，避免裁剪后运行时 enum 反射依赖。全部 52 个源名称提供中／日描述，英文保持 Record3.GetItems 原名，原名可在详细信息查看。普通数值与首通时间请求互斥；有草稿时限制切换记录和模式，沿用工作副本、撤销与导出。
核心与公开 API 专项已通过日文／国际版、RS／E／FRLG 及不同安全密钥的 14 组组合，包含所有开放记录、UInt32 边界、时间范围、异常旧值、保留槽、请求原子性、原件保持和完整文件 XOR 对照。前端及名称覆盖专项 6 项、完整原生、API 91 核心构建、26 类型裁剪检查与最终完整 verify 已通过。只读存档可切换数值／时间显示，写入仍禁用；浏览器与真实存档待核验。

## 绿宝石对战开拓区

2026-10-09 核对 SAV_Misc3.cs／Designer 的 ReadBattleFrontier、统计值写入、继续标记、通行证和标志保存，以及 Core BattleFrontier3 与四个枚举、SaveBlock3SmallE／SaveBlock3LargeE。仅 SAV3E 可用。

七设施依次为 Tower、Dome、Palace、Arena、Factory、Pike、Pyramid。合法模式数为 4、2、2、1、2、1、1；两种等级组为 Lv. 50／Open，API 编号为 0／1。读取与校验使用 Core GetModeCount／GetValidStats，不接受 Core 内部钳制可能掩盖的越界模式。
合法统计项共 66 个，继续挑战组合 26 个。Tower／Palace／Arena／Pyramid 提供当前和最高连胜，Dome 另有冠军次数，Pike 另有最高通关数，Factory 提供当前／最高连胜与租借更换次数。NumericUpDown 默认最小零、显式最大 9999；旧 UInt16 超限值读取保持，未修改字段不参与补丁。

BattleFrontier 位于 SmallBlock 0xCDC、长 0x1DC；继续标记为开头 UInt32 的 0–25 位，26–31 保留。各统计项的基址和模式／等级步进由 BattleFrontier3.GetStatOffset 确定，独立原生对照表已覆盖每个地址。BP 与累计 BP 紧随区块，分别位于 0xEB8、0xEBA；输入范围 0–9999、0–65535，未改的异常原 BP 保留。
银／金标志从事件索引 0x8C4 起每设施两位，通行证为 0x8D2；事件区为 LargeBlock 0x1270 起的 300 字节。上游银未开、金已开时显示无标志，保存会规范化；网页显示原始两位状态，仅明确选择新标志才写入：无标志清两位、银开银关金、金同时开银和金。无关标志与故事事件不被自动改写。

API 92、独立 Worker 路由与三语入口已接入工作副本、撤销和完整导出。设施／模式／等级选择位于编辑禁用区之外，只读状态仍可浏览全部组合。成绩与全局设置草稿互斥，未应用时限制切换，提供放弃。全部请求先验证动作、字段归属、数量、重复项与范围，再写入；导出复核区块、BP、全部事件标志、游戏、区域、类型、长度和校验。
原生及公开接口专项已通过日文／国际两布局：66 地址、26 位、七设施的全部旧银金组合、BP、保留位、相邻数据、无效请求原子性、原件与完整导出。前端 4 项专项、完整原生、API 92 核心构建、26 类型裁剪检查及完整 verify 已通过；浏览器和真实存档待核验。

## 绿宝石船运与船票

2026-10-09 核对 SAV_Misc3.cs／Designer 的 ReadFerry、SaveFerry、B_GetTickets_Click，以及 Core PlayerBag3E、InventoryPouch3、InventoryPouch、SaveBlock3LargeE。仅 SAV3E 适用，十个布尔控件没有数值输入或隐含剧情重置。

可乘船、南方孤岛／诞生之岛／遥远孤岛／肚脐岩／开拓区可达、四岛初始事件依次对应事件索引 0x864、0x8B3、0x8D5、0x8D6、0x8E0、0x1D0、0x1AE、0x1AF、0x1B0、0x1DB。事件区为 LargeBlock 0x1270 起 300 字节，未选择标志及相邻位须保持。

五种船票 ID 为 265、275、370、371、376；名称取当前语言的 Core GetItemStrings。HasItem 仅在 ID 相同且数量大于零时认为已有。日文版默认包括古航海图，非日文版缺少该未发行道具时须明确选择；已有古航海图保持原样。重要物品袋在 Inventory 区内 0x140，30 格，每格两个 UInt16；Inventory 位于 LargeBlock 0x498、长 0x3B0。数量 XOR 安全密钥低 16 位，读写使用 Core pouch codec，不排序或规范化其他袋。

添加从 Index 为零的第一个空格开始；沿用上游 end + missing.Length >= 30 的空间拒绝规则。额外拒绝目标连续范围内任何非零 ID，避免覆盖空洞之后的物品，包括数量零的旧物品。预览列出已有、缺少、目标格位和不可用原因；应用前校验源存档摘要并重新计算计划，过期预览拒绝。修改只写重要物品袋，原件与其他物品保留；沿用工作副本、撤销、完整导出及校验复核。

API 93 已接入公开读写、独立 Worker 和中／英／日入口。标志与船票通过两视图切换；船运标志只发送修改项，船票预览与标志草稿互斥，允许取消预览和放弃草稿。只读状态仍可浏览两种船票计划，应用保持禁用；共享 44px 操作栏与复选标签保持既有浮动工具密度。
核心与公开接口专项已通过日文／国际版与三种安全密钥的六组组合，覆盖十个标志、全部 32 种船票持有组合、数量零与超标旧物品、严格空间边界、空洞覆盖保护、摘要过期、无效请求原子性、原件保持与完整文件对照。前端 4 项专项、类型、定向 Lint、完整原生、API 93 核心构建、26 类型裁剪属性检查与最终完整 verify 已通过；浏览器连接仍失败，UI 和真实存档待核验。

## 第三世代小游戏成绩与树果粉

2026-10-09 核对 SAV_Misc3.cs／Designer 的 ReadJoyful、SaveJoyful、七个小游戏 MaskedTextBox 和树果粉控件，以及 ISaveBlock3SmallExpansion、SaveBlock3SmallE／FRLG、Util.ToUInt32。仅 E／FRLG 可用，RS 不提供此窗口。

按界面顺序编号 0–7：跳跃连续数、最高成绩、五连次数、满员游戏次数，采树果连续数、最高成绩、五连次数，树果粉。前七项十进制 Mask 为 0000，范围 0–9999、最多四位；树果粉 Mask 为 00000，范围 0–99999、最多五位。空白按 Util.ToUInt32 解释为零。Max Players 对应 JoyfulJumpGamesMaxPlayers 的游戏次数记录，不能套用联网人数的 2–5 限制。

E 的八项 SmallBlock 偏移依次为 0x1FC、0x208、0x200、0x202、0x210、0x20C、0x212、0x1F4；FRLG 为 0xB00、0xB0C、0xB04、0xB06、0xB14、0xB10、0xB16、0xAF8。一般次数为 UInt16，树果粉为 UInt32 XOR 完整安全密钥。两项最高成绩 Core getter 读取 UInt16，setter 写入 UInt32，WinForms SaveJoyful 另转为 ushort；99990 只属于 getter 展示钳制和 Core setter 上限，不代表四位 GUI 输入范围。新成绩至多 9999，保证写入与回读相等。

API 94 已区分成绩读取值与完整 UInt32 存储值，不自动截断或规范化旧值；只写明确修改项，未选成绩保持高 16 位。允许明确用当前输入重新保存成绩，这时调用上游 setter 重写四字节；两项完整存储值和重存操作位于可浏览的折叠详情。保护相邻树果压榨记录、空隙、联机标志及安全密钥，先校验全部请求再写入；沿用独立 Worker、工作副本、撤销、原件保持与导出回读。

三语界面参考上游小游戏名及可用控件译名，最大玩家控件按实际 GamesMaxPlayers 记录描述为满员游戏次数；来源为 WinForms Resources/text/lang_zh-Hans.txt／lang_ja.txt 和 SmallBlock 属性。响应式两组字段没有额外卡片，44px 输入、操作与折叠摘要保持可访问尺寸，只读仍可打开原始存储详情。原生及公开接口专项已通过日文／国际版 E 三种密钥、FRLG 四种密钥共十四组：八个地址、四／五位上限、旧超限值、UInt16 读取与 UInt32 写入、成绩高位、树果粉 XOR 及超过 65535 的精确回读、相邻数据、无效请求原子性与原件。前端 4 项、类型、定向 Lint、完整原生、API 94 核心构建、26 类型裁剪检查与最终完整 verify 已通过；浏览器及真实存档待核验。

## 第三世代杂项主设置与幻影岛

2026-10-09 核对 SAV_Misc3.cs／Designer 的主设置、劲敌姓名 TrashEditor、六个 Trainer Card ComboBox 和 B_ForceMirageIsland_Click，以及 SAV3RS／E／FRLG、三个 LargeBlock、SpeciesConverter、StringConverter3。此组与原有独立小游戏、船运、开拓区、记录、绘画、装饰品和宝可方块入口共同覆盖 SAV_Misc3 窗口，不能与另一个秘密基地窗口混为一项。

三个主系列均提供代币输入，NumericUpDown 默认最小零、显式最大 9999。RS／E 的 LargeBlock 存储位置 0x494，FRLG 为 0x294，均为 UInt16；RS 原值读写，E／FRLG 使用 SAV.Coin 经安全密钥低 16 位 XOR。网页十进制最多四位，只改选中字段；未修改的超限旧代币保留。

FRLG 劲敌姓名控件最多 7 字符，LargeBlock 0x3A4C 起 8 字节。SAV3FRLG.RivalName setter 用区域字符集、最大 7 和 ClearZero；网页应先在临时缓冲区编码并回读验证，失败时不改存档，未改文字保留原始结束符与残留。原始姓名编辑允许精确 16 位十六进制，与文字补丁互斥。
六个训练家卡片图标对应 work 0x43–0x48，变量区从 LargeBlock 0x1000 起，每项 UInt16。显示和保存分别使用 GetNational3／GetInternal3；候选来自过滤种类，主系列上限 386，另有空种类 0。旧未识别／非规范内部编号只读保留，只有明确替换才转换为标准内部编号；不自动改写其他图标。

RS／E 的幻影岛按钮把队伍首槽原始 PID 的低 16 位写入 work 0x24。变量区基址为 RS 0x1340／E 0x139C；PartyBuffer 均从 LargeBlock 0x238 起，队伍计数位于 0x234。上游不检查队伍人数，也不解密或检查首槽宝可梦；网页显示原始个性值、将写入的值与计数为零的提示，仍保持同一来源，不以队伍列表替代原始槽位。请求校验所展示的 PID 仍匹配，再从当前首槽计算值。

API 95 已实现各操作分组，先完成全部验证后才写入，保护完整变量区、姓名、代币、队伍与密钥；沿用独立 Worker、工作副本、撤销、原件保持和完整导出回读。三语界面复用本地宝可梦图片与共享选择器，未知内部编号显示未知状态；原始编号保留、姓名文字／字节互斥、草稿跨组互斥，只读仍可浏览姓名表示方式与来源。编码失败、图标无效、幻影岛来源过期和校验失败提示均按当前语言显示。
原生及公开接口十六组布局／地区／密钥专项已通过：RS／E／FRLG 代币边界与 XOR、两地区七字符姓名与八字节残留、无损编码失败原子性、六图标地址和全部 0–386 映射、未知内部编号保留及显式清空、空／异常队伍计数与原始 PID 低位、过期来源、完整文件及原件保持。前端及错误本地化 5 项专项、类型、定向 Lint、完整原生、API 95 核心构建、26 类型裁剪检查与最终完整 verify 已通过；浏览器和真实存档待核验。

## 第三世代秘密基地

2026-10-09 通读 SAV_SecretBase3.cs／Designer，核对 GenderToggle、SecretBaseManager3、SecretBase3、SecretBase3Team、SecretBase3PKM、FilteredGameDataSource 和 G3PKM.Form。仅 RS／E，窗口只更新训练家与六个成员，不提供基地创建、删除、装饰布局或文件导入导出按钮。

物理区域为 RS LargeBlock 0x1A08／E 0x1A9C，20 格，每格 160 字节。Manager 仅显示姓名首字节不是 FF 的记录；槽位身份须使用原始 0–19 位置，不能以过滤后序号写入。Manager.Save 会把原本空槽的全部七个姓名字节改成 FF；网页只写选中记录，保留其他空槽残留和所有装饰数据。

训练家姓名在记录偏移 2，长 7 字节，输入最多 7 字符，按记录自身偏移 0x0D 的 Language 编码，使用 None 并无损回读；原始姓名为精确 14 位十六进制，与文字互斥。清空姓名会令记录从已记录列表消失，但保留同槽其他信息。TID／SID 位于 9／11，五位十进制，空白零、超过 65535 钳到 65535；进入次数在 0x10，三位、空白零、上限 255。性别为偏移 1 的第 4 位，输入 0／1；当天战斗为第 5 位；登记状态为第 6–7 位，新状态仅 0／1，原始 2／3 未选择时保留。训练家类别由 TID 低字节模 5 派生，为只读信息，不存在类别输入。

队伍区域偏移 0x34、长 108，六个成员为并行数组：PID 在 +0、每格 4 字节；四招式在 +0x18、每格 8；内部种类在 +0x48、道具在 +0x54、每格 2；等级 +0x60、统一 EV +0x66、每格 1。新种类 0–386、招式 0–354；道具候选按当前游戏及 HeldItems 通过 Core FilteredGameDataSource 获取，不能只用编号上限填满候选。PID 最多 8 位十六进制，空白零，非十六进制按上游规范化为 FFFFFFFF。成员显示位置 1–6，接口为 0–5。

非空成员新等级 2–100（默认 NumericUpDown 最大 100），统一 EV 0–85；旧超限字段及未改内部编号保留。明确选择空种类会清空该成员 PID、种类、道具、四招式、等级和 EV，其他五格不动。普通成员只发送修改项，禁止把空成员与其他编辑字段混合写入。
未知图腾形态为 PID 派生的 0–27，A–Z／!／?。上游 ShowPKM 使用 Form - 1 导致显示偏移，形态 ComboBox 也未接到更新；网页按实际零起始形态显示，并使用 Core PK3.Form 在 Worker 中生成候选 PID，先展示后写入明确的个性值，不在 JS 重写算法或随机生成。其他种类没有形态控件。

API 96 已开放读取、训练家／成员补丁、独立形态建议与三语入口。编辑先校验完整请求，在分离的单格缓冲区修改后才写回；导出复核完整 20 格区域、相邻数据、类型、版本、区域、长度与校验，沿用工作副本、撤销及原件保持。未处理草稿时限制基地、成员及视图切换；只读仍可浏览全部已记录基地和成员。六格本地图像、候选过滤、原始登记保留、原始／目标形态及新 PID 展示均已接通，名称、位置、字段和预览错误按当前语言显示。
核心及公开接口四种 RS／E 与日文／国际布局专项通过，包含稀疏实际槽位、各记录语言、七字节姓名残留、旗标原位操作、六个成员全部数组地址、合法候选过滤、未改旧值、空成员清空、隐藏空槽与装饰保护、28 种形态建议及明确 PID 应用、请求原子性、原件和完整文件对照。前端及错误本地化 5 项、类型、定向 Lint、格式、完整原生、API 96 核心构建、26 类型裁剪检查与最终完整 verify 已通过。浏览器与真实存档待核验。

## HGSS 宝可装置通讯录

2026-10-09 通读 PokeGear4Editor.cs／Designer，核对 SAV4HGSS 的 Get／SetPokeGearRoloDex、Get／SetCallerAtIndex、三种批量操作，以及 PokegearNumber。此子窗口只有通讯录属性数组，没有地图或广播控件；其他 HGSS 杂项按独立窗口继续追踪。

通讯录位于 General 0xC0EC，共 75 格，每格一个 signed byte。枚举 None 为 -1（物理 FF），Mother 为 0，Ernest 为 74；PropertyGrid 标准选项为这些枚举，数值底层范围 -128–127，空白或十六进制不是有效 enum 十进制输入。网页默认候选选择，提供明确的有符号原始数值编辑；原始 byte 128–254 对应 -128–-2，其他未定义值 75–127 也需保留，不自动排序、去重或压缩空槽。

加入全部按 0–74 顺序写入，排除当前主角（Gender 0 为 Ethan／3，其他为 Lyra／4）及 Bike Shop／15，余下 73 项，末尾两格为 None。仅加入非训练家按 Mother、Elm、Oak、Ethan、Lyra、Kurt、Daycare Man、Daycare Lady、Bill、Baoba 的指定顺序排除主角，得到 9 项，其他 66 格为 None。清空全部 75 格均为 None。两种加入都不是合并现有通讯录，而是替换全部内容。

批量预览应使用 Core 的实际操作生成，并显示替换后的顺序、排除项目和空格数量；应用前核对原存档摘要，过期计划拒绝。逐格补丁仅写明确位置，完整请求先验证再修改，保护相邻 General 字节、主角性别与其他数据，沿用工作副本、撤销和原件保持。上游没有联系人中文／日文枚举资源，操作及角色描述按当前语言显示，专名保持上游标识并提供来源名。

API 97 已接入三语 Worker 入口、逐格选择／原始值、完整列表和三种批量预览。核心与公开接口八布局专项通过，覆盖 75 个地址、全部字节编码、完整文件独立对照、角色排除顺序、重复与空洞保留、无效请求原子性及摘要过期。前端和错误本地化 5 项专项、类型与定向 Lint 已通过；完整原生、API 97 核心构建、裁剪后 26 类型属性检查与最终完整 verify 通过，后者覆盖 228 文件／859 项测试及网页／PWA 构建。浏览器与真实存档待核验。

## Battle Revolution 玩家记录与装备（API 99）

2026-10-10 核对 `SAV4BR.cs`、`PBR/GearUnlock.cs`、`PBR/GearCategory.cs`／ModelBR，以及 WinForms `SAV_Gear.cs`／Designer。完整存档为 0x380000，两个 0x1C0000 分区均使用 GeniusCrypto；由有效校验及保存计数选择分区。每分区四份玩家记录，每份 0x6FF00。单个装备修改只能作用于明确选中的玩家，导出重新加密并验证完整容器。

玩家选择作用于统一存档信息、训练家姓名、宝可梦和箱子读取以及专用工具；切换不修改字节或加入撤销历史。Client 在每个 Worker 请求中明确携带所选玩家，进程重建后重新配置；新文件重置上下文，撤销／恢复工作副本保持玩家选择。常规训练家和箱子写入仍遵守原白名单，不把专用装备接入当作全部 BR 编辑完成。

装备标记位于所选玩家 Data 的 0x584EC，长 192 bytes／1536 bits。六种角色、十类装备的可编辑位和默认值来自 GearUnlock.GetOffsetCount／GetDefault，不允许写入类别间的空洞。徽章中少年类别额外的 16 个标记由所有角色共用。单项明确补丁保留未选位；全部解锁和恢复默认按 Core 清空整块后重建已知位，不保留整块的旧空洞。恢复默认给各角色的默认装备解锁，不是全部设为 false。

六种特殊套装为 0x434 的 bit 0–5，独立于普通装备批量操作；逐项修改保留其余标记和高两位。批量预览展示解锁数、全部改变位置和目标 192-byte 块，应用前核对完整原文件 SHA-256 与玩家索引 0–3。输入为布尔和严格候选位置，空值／重复／越界／混合字段拒绝。复制解析缓冲，保留原文件、其余三玩家和备用分区。

操作、角色和类别使用三语界面及上游 WinForms 资源；Core 装备专名只有英文／日文资源，中文按 GameLanguage 规则回退英文并明确说明。已接通工作副本、撤销及完整导出，保持通用只读边界。核心专项四种区域／分区组合和各四玩家通过，覆盖全部候选位补丁、特殊套装、完整批量计划、联动信息和箱子以及完整加密文件对照。前端、Worker 上下文与错误本地化共 7 项专项、类型和定向 Lint 通过；完整原生、API 99 核心构建及裁剪后 26 类型属性检查通过，最终 verify 覆盖 231 文件／872 项测试与网页／PWA 构建。外部浏览器与真实存档待核验。

### 对战通行证窗口（API 100）

已通读 `SAV_BattlePass.cs`／Designer、BattlePass／BattlePassAccessor。187 个对战证分布于三个银行，每份 0x6EC。日文／其他版的自定义 32／37、下载 30／25，租借 6、朋友 61；其他三类 30／12／16。删除租借无效，自定义删除保留设计／可用状态并按语言初始化，部分类别删除后按 Issued 连续向前移动；相邻交换可跨类别边界。导入／导出为完整 0x6EC 数据，解锁自定义只开 Available，租借开 Available 与 Issued。

六份内嵌 BK4 各带四个链接字节；Box／Slot 控件 0–255，Flags 控件 0–65535 但 Core 只写低 15 位，最高存在位单独保持。种类写入会向前找空位，删除后向前压缩。人物、装备、称号、台词、创建者、国家／地区、语言、玩家 64-bit ID 和对战记录已接入独立入口，浏览器与真实存档仍待核验。

| 分组             | 已核对输入与存储                                                                                                                                                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主设置／人物外观 | 名称 11 字符；TID／SID 五位十进制，空白为 0，允许 0–99999，底层 ushort 截取低 16 位，应用前显示目标值。称号、13 种角色、三种肤色、两种照片、设计及十类装备使用 Core／WinForms 候选。角色变更重置十项默认装备和预设索引；其他未修改原值保持。                                                  |
| 台词             | 问候／换入一／换入二 25，出场 27，胜／败 51 字符；六个预设开关和 UInt16 索引分别编辑。换行 ⏎、比例字体标记 ￼ 和宝可梦名称变量 Ⓟ 使用转义，各占两个 UTF16 编码单位。                                                                                                                           |
| 创建者           | 创建者名称 11；生日月份／日期控件各允许 4，但实际 8-byte 字段最多容纳 3 字符及终止符，网页明确拒绝有损截断。地区代码四个 ASCII 字符；玩家 ID 为十六位十六进制 UInt64，空白为 0。国家／地区取第四世代候选，变更国家且未给地区时选其首个地区。语言为对战证内部 0–5 对应日／英／德／法／西／意。 |
| 自我介绍         | 日文上限 53，其他语言 51，后者保存时加比例字体标记；支持换行。只改语言时保留原始自我介绍，明确编辑介绍时才按新语言重新编码。                                                                                                                                                                  |
| 成绩             | 四个对战次数为 signed Int32 全范围；十个竞技场通关次数为 byte 0–255。所有数值均为十进制整数，除 ID 外空白拒绝。                                                                                                                                                                               |
| 队伍             | 六格真实成员及本地图像、昵称、原训练家姓名、ID、PID、招式／PP、个体值和努力值。导出解密 BK4 后可用独立宝可梦编辑器修改，再导入此格；导入先由 Core 转换、展示成员、实际填补位置和三语兼容性提示。存在提示时需明确确认才应用。自定义通行证按 FindSlot 更新链接，租借设为 255／0。               |

文本提供独立原始字节编辑，严格匹配字段字节数；未修改字段不重编码，保留隐藏字节、未定义候选和异常旧值。普通文字编辑先校验显示长度与转义后长度，并回读确认无损编码。操作请求在完整副本中验证后才复制所有对战证银行，其他玩家和存档区域保持。删除、交换、解锁、完整导入和成员导入／删除显示预览并核对当前文件摘要，过期请求拒绝。

专项发现 PKHeX 26.08.26 的 BattlePass.SetPartySlotAtIndex 使用 party 写入器，而格位只有 136-byte stored 数据加四个链接字节，实际导入会越界。接入层改用 WriteEncryptedDataStored 写真实 136-byte 格位并单独设置存在位，保留四个链接字节；没有修改 vendored Core。成员导出使用 136-byte 解密 BK4 stored 文件，避免把四个链接字节当作宝可梦 party 数据；存档导出保持原文件长度。新导入成员的 stored 状态标记遵循 SAV4BR.SetPartyValues(false)。

六个紧凑分组保留所选通行证、字段和成员位置，草稿或预览未处理时禁止切换对象。操作、字段、角色与类型使用上游三语资源；装备、设计与称号缺少中文专名时沿用 Core 英文回退。所有编辑沿用四玩家上下文、工作副本、撤销及完整加密导出；API 100 握手不兼容旧 Worker。

四种地区／分区扩展专项与前端、玩家上下文和错误本地化共 7 项专项通过；定向 Lint、类型及完整 verify 通过，后者为 232 文件／876 项测试及网页构建。保留一次 Vitest worker 退出超时提示，退出码 0。增加非零链接标记夹具后的完整原生、API 100 核心构建、裁剪后 26 类型属性检查及使用新核心的最终网页／PWA 打包通过，保留既有 JSExport、裁剪和网页构建提示。浏览器与真实存档仍待核验。

### 独立 BR 训练家窗口（API 101）

已通读 `SAV_Trainer4BR.cs`／Designer 与 SAV4BR 对应属性。其四个成绩为分散地址的 UInt24，控件 0–16777215，不可套用对战证的 signed Int32；十种通关次数 0–255，另含十一种竞技场／通关解锁位。金钱六位 0–999999；训练家姓名七字；ID 通过 ChangeFFFF 将五位输入限为 65535，不沿用对战证的截取行为。小时五位且限 65535，分／秒各两位，保存按 60 取余。

姓名位于 0x390／16 bytes；生日月／日 0x3B0／0x3B8，各 8 bytes；自我介绍 0x3C4／108 bytes。PlayerID 为八个分散字节，语言同时改变日文记录标记。源 PlayedHours setter 清除分钟和秒，后续接入需按整个时间组处理，不能把单小时补丁直接套用该 setter。

Country／Region 读取位置 0x3C0／0x3C2，但 setter 写入 0x578／0x57A，两者不一致。接入层以 getter 的读取地址实现明确补丁，并保护原 setter 指向的两个区域；完整文件独立对照及读取往返专项通过。没有修改 vendored Core，此为工程语义验证，真实游戏存档仍待核验。

API 101 已接通独立三语训练家入口、个人信息、记录、竞技场标记和游戏时间四组。训练家姓名七字、生日字段原始字节、自我介绍及分散八字节玩家 ID 可分别编辑。保留未修改原值、姓名尾随数据、原时间小数与其他玩家；明确编辑时间组时用完整时分秒重写，分秒按 60 取余，不能直接使用清除分钟的小时 setter。

TID／SID 五位输入超过 65535 时按 ChangeFFFF 限为 65535，空白为 0，界面先显示目标值；后端同样验证五位宽度并规范化。Money 六位，空白为 0；提供最大宝可券数草稿按钮。PlayerID 最多十六字符，按 Util.GetHexValue64 提取十六进制并补齐十六位，应用前显示结果；原始字节模式必须完整匹配 8 bytes。生日控件虽允许四字，8-byte 终止字符串实际最多三字，拒绝有损截断。自我介绍日文 53、其他 51，变量与换行各占两单位，非日文明确编辑时添加比例字体前缀。

语言候选完全采用 GameInfo.LanguageDataSource(3, Gen4)，只有日／英／德／法／西／意，不提供韩文。变更语言同时改变此玩家 Japanese 标记及对战证类别数量，界面说明该影响；未修改自我介绍、通行证和装备数据保持。国家单独变更时选新国家的首个地区；原未知地区未修改时保持。

所有请求携带明确玩家 0–3 与当前文件摘要，在独立玩家副本中完整验证后才复制数据；导出重新读取并核对玩家、校验与整个玩家区（仅排除重新计算的头部校验字节）。沿用工作副本、撤销、完整加密导出与原件保持；常规训练家／箱子白名单不在本批扩大。

四种地区／分区专项已通过，覆盖 UInt24 分散地址、地理改动及相邻字节、时间、十一标记、文本与原始字节、六种语言、非法请求原子性和完整文件对照。姓名不变／清空、输入宽度及 HEX 解析补充检查通过；前端／玩家上下文／错误本地化 7 项专项、定向 Lint、类型与完整原生通过。API 101 核心构建、裁剪后 26 类型属性检查及最终 verify 通过，后者为 233 文件／880 项测试与使用新核心的网页／PWA 打包。保留既有 Hook、JSExport、裁剪和网页构建提示，本轮功能检查无失败。外部浏览器与真实存档仍待核验。

### 第四世代对战录像窗口（API 102）

已通读 `SAV_DLC4.cs`、BattleVideo4 与 SAV4.GetBattleVideo，对照 Pt／HGSS 的 ExtraBlocks。该窗口实际是四格对战录像的队伍读取、导入和加密／解密导出，没有录像播放、成员编辑或删除控件；DP 不支持此额外块。静态网页可按本地文件操作接入。

录像为 0x1D60 bytes，内含 0x1D50 有效数据和 16-byte footer，扩展名 bv4；CryptoData 为 0xE8–0x1D4C，CRC16 派生 Seed。导入需检测加密状态、保留目的格 Magic／Revision／BlockSize／BlockID，更新双层校验并保存为加密状态；不能替换邻接填充或复制来源 footer。未初始化的目的格 GetBattleVideo 为 null，原窗口禁用导入。

Pt 四格基址为 0x24000／0x26000／0x28000／0x2A000；HGSS 为 0x27000／0x29000／0x2B000／0x2D000，实际分区由 General 的 key／backup／prefer 及额外块检测选择。必须保护另一分区、Hall of Fame、Battle Hall、General 与其他录像。

队伍最多四训练家各六成员，录像成员每份 0x70 bytes。应使用 GetTeams 读取全部四队，不能用只包含前两队的 Contents。InflateToPK4 只能恢复录像保留的字段，版本与捕获信息等无法恢复，界面需明确该区别；不把补零得到的完整 PK4 当作原宝可梦全量记录。

API 102 已接入四格选择、四队本地图像、成员种类／昵称／等级和训练家名称、文件导入预览及加密／解密导出。保留原始成员数量，超过六时按 Core 最多展示六个；超出可恢复种类范围显示未知成员，不调用个人数据表的越界索引。界面操作、数据限制、空格位及异常提示使用三语，未初始化格位可浏览但不能导入／导出，不新增上游没有的初始化或删除操作。

核对 BlockInfo4.GetKey 与 SAV4BlockDetection.CompareExtra，发现录像首四字节 Key 参与 General 的格位选择，而原导入窗口只保留 footer。接入层同时保留目的格 Key，避免不同来源文件使重新读取的格位消失；不修改 General key／backup／prefer，也不修改 vendored Core。导入先完整检查 0x1D60 长度及声明尺寸、检测加密状态、在独立副本准备目标数据，再按源摘要明确应用。导入后重新读取四格快照、格式、版本、长度和存档校验，沿用工作副本、撤销和原件保持。

读取与解密使用录像副本，不能因展示队伍而改变工作文件。导出不重写当前录像或修复其字节；解密导出仅改变输出副本。原窗口无播放与成员写入功能，本批保持该功能边界，并明确部分字段无法恢复。Pt／HGSS 两分区专项、前端／玩家上下文／错误本地化 7 项专项、定向 Lint、类型及完整 verify 已通过，后者为 234 文件／884 项测试与网页／PWA 打包。完整原生、API 102 核心构建、裁剪后 26 类型属性检查及使用新核心的最终网页打包通过，保留既有 Hook、JSExport、裁剪和网页构建提示，最终检查退出码均为 0。浏览器与真实存档待核验。

### 第四世代 Geonet 窗口（API 103）

已通读 SAV_Geonet4.cs、Geonet4、LocaleNDS4、IGeonet 与 ComboItemUtil 的地区／点位列表。DP／Pt／HGSS 基址分别为 General 0x96D8／0xA4C4／0x8D44；第一字节为 GlobalFlag，后两字节为注册国家／地区，点位从基址 +3 起共 233×16 bytes。每国家 64 格，每格两位：0 无、1 今天首次通信、2 已通信、3 玩家注册地。

窗口只列 LocaleNDS4 定义的子地区；没有子地区的国家只列 0，其他从 1 到实际数量。国家／地区资源按当前语言排序，必须使用真实 Value 地址，不能以表格行号代替编码。未显示的 64 格位仍须保护。

所有三种批量操作均按 Core 改对应可用点位，不清空整个块：全部、仅合法国家与清除都调用 SetSAVCountry，将注册地设为红点；前两种打开 GlobalFlag，清除则按注册国家是否非日本设定。窗口保存先 ClearAll，再写表格行，最后再次 SetSAVCountry；因此不能把清除当作整个块归零，也不能允许注册地永久覆盖为其他颜色。

Geonet4 构造函数通过 GlobalFlag setter 回写旗标，会将旧非零值规范化为 1。接入层读取直接按地址取值，批量预览和操作才在副本中调用 Core，保护原读取数据。普通点位补丁在 Core 保存后恢复原旗标 byte，明确修改旗标或重新保存时才规范化，未修改其他数据。

API 103 已接通三语国家／地区目录、真实地址点位编辑、GlobalFlag 草稿、三种批量操作与明确重新保存预览。四颜色沿用 0–3；全部批量计划由 Core 在副本生成，展示可见点位颜色数量、所有改变的物理位置及旗标结果，包括未显示的注册地变化。所有请求核对源摘要，完整验证后只复制 3731-byte 地图区，保留相邻数据、国家／地区、其他 General 区与另一分区，沿用撤销和原件保持。

保存任何点位或旗标时沿用 SetSAVCountry，使有效注册地最终为红点；普通补丁不清空其他点位。注册国家 0 表示未登记；国家 1–233 且地区 0–63 才能表示地图地址。注册地可落在未显示但可表示的格位，同样保持红点；越界旧注册地仍可浏览，但关闭写入，防止 Core 数组越界或跨国家写入。

DP／Pt／HGSS 与未登记／日本／其他国家共九布局专项通过，覆盖全部可见地址批量补丁、四颜色、非零原旗标、隐藏位置、注册地红点、四种完整计划、原件与全文件独立对照。补充隐藏注册地检查与完整原生回归、前端专项 7 项及完整 verify（235 文件／888 项）通过。API 103 核心构建、裁剪后 26 类型属性检查与最终网页／PWA 打包通过；浏览器与真实存档待核验。

### 第四世代甜甜蜜树窗口（API 104）

已核对 `Subforms/Save Editors/Gen4/SAV_HoneyTree.cs`、Designer、`HoneyTreeValue`、`HoneyTreeUtil` 与 `SAV4Sinnoh`。仅 DP／Pt，21 棵树索引 0–20；DP／Pt 的 General 基址分别为 0x72E4／0x7F38，每棵八字节。Core 读取器边界允许索引 21，接入时必须按实际树数量拒绝它。

窗口十进制范围为剩余时间 0–1440 分钟、摇动 0–3、群 0–3、槽 0–5；可捕获按钮设置时间 1080。时间为 uint32，后四字节分别保存槽、子表、群及摇动；设置群会将子表改为 max(0, 群−1)。读取旧异常值时应保留原字节，明确修改或重新保存时才按窗口范围处理。

小卡比树位置由 Core 使用 ID32 计算四个索引，沿用其重复处理规则，不自行去重。非小卡比树使用小卡比群时源窗口提供警告，应保留警告与选择能力。树种类使用 Core 的 DP／Pt 表，不另写 JavaScript 判定。

API 104 接通三语 21 树选择、时间／摇动／群／槽的明确单项补丁、1080 分钟可捕获操作及四字段重新保存预览。普通操作只修改提供的字段；修改群才触发子表 setter，可捕获不改群／槽／摇动。显式重新保存沿用源窗口四项上限与群 setter，预览包含规范化数值及完整八字节变化。切换树只浏览，未应用草稿阻止切换，保护异常旧值。

字段十进制、空输入表示不修改，明确输入 0 表示写入零；时间四位，其他一位，前端与 Core 边界一致。树选择使用稳定 0–20 索引，不因三语显示或小卡比树重复而重编号。种类目录完整 4×6，由 Core 生成；DP 表中 Silcoon 同时显示钻石甲壳茧／珍珠盾甲茧，Pt 使用自己的表。异常群／槽仍可读取原值及原字节，不用异常值索引种类表。

所有写入验证源摘要、格式、校验和、索引及全部字段后再写单棵树，导出重读并比对 21 棵树完整数据。前端专项 6 项与 DP／Pt 全部树地址原生专项通过，覆盖四字段上下限、部分补丁、旧子表、可捕获、重新保存、24 种类、重复小卡比树、原件、相邻数据及完整文件独立对照。完整原生回归、verify（236 文件／891 项）、API 104 核心构建、裁剪后 26 类型属性检查与最终网页／PWA 打包通过；浏览器与实档待核验。

### 第四世代 Misc 窗口（API 105）

已核对 `SAV_Misc4.cs` 的 Main、Poketch、Walker、Seals、Accessories、Backdrops、Records 与战斗设施分组及对应 Designer／Core。API 105 已接通独立 Misc 入口，现有宝芬／宝可装置／全能竞技由相关编辑器按钮联动，不以已有竞技入口替代整个 Misc 窗口。

- 飞行地点使用事件旗标基址 2480，神奥 20 项、城都／关都 27 项；目录由源窗口的 flag／LocationID 对照与 `Gen4.Met0` 生成，不能按显示行号或语言排序重新编码。
- 宝可表仅 DP／Pt，当前应用、逐应用解锁及解锁数量一起保存。点阵 24×20、四级灰度 248／168／88／8，存储 120 bytes；源图片导入限制尺寸 24×20、最多四种亮度、文件不大于 0x80A。点阵点击按两位像素循环，图像转换与原有缓冲写入语义仍需专门验证。
- 计步器仅 HGSS，瓦特与步数 GUI 上限均为 9,999,999，路线由 Core 旗标目录提供。地图升级使用 `MapUnlockState4`，地下旗帜与宝可全能竞技点数保持各自游戏归属。
- 贴纸 80 项、两位十进制、0–99；合法批量只含 0–76，完整批量包含未发布 77–79。饰品 100 项、一位十进制，复数数量 0–9；单件饰品在 Core 按非零转换为旗标，需要显示保存结果而非假设储存了输入数量。
- 背景 18 个排列位置；0–16 已发布、17 未发布、18 表示空。源保存先移除全部背景再跳过空位按顺序压缩，名称列表虽按语言排序，保存身份仍是原资源索引。读取不应自动重排或压缩旧位置。
- 记录块 DP／Pt／HGSS 的 General 基址分别为 0x5F08／0x61B0／0x4B3C；32 位记录分别 44／71／72 项，16 位记录均 77 项。Pt／HGSS 的 `Record4.GetRecord*` 会解密，`EndAccess` 会刷新记录校验并加密，浏览在副本操作。GUI 使用完整 uint／ushort（十位／五位十进制），Core 按各记录的大小类型与分数位置另设上限。接入分别展示 GUI 输入上限与 `GetMax32`／`GetMax16` 保存上限，允许来源 GUI 可输入值，再由 Core 截顶并在预览中显示实际值。

补充已通读战斗设施窗口流程：塔的当前次数与继续次数由七次一组的事件回调联动；普通数值上限 9999，塔继续计数为 ushort。工厂按两种等级切换地址；城堡继续旗标开启时还设置下一字节 bit 0，关闭时不清掉这个附加位。Hall 当前种类、十七项半字节等级与额外 Hall 块计数分别保存；每两项等级按两字节步长存储，不能假定所有类型数据连续。

城堡等级窗口读取三个间隔两字节的 int16（回复／道具 1–3、情报 1–2），但 ValueChanged 使用 `WriteInt32LittleEndian`，会覆盖下一等级或相邻数据。接入采用 `WriteInt16LittleEndian`，首轮完整文件夹具验证相邻等级及保留区域不变。印章使用 Pt 的 work 79 起、HGSS 的 work 77 起共五项状态，0–4 分别未获得／银待领／银已领／金待领／金已领。

Hall 的 Core 块为 0xBB0 bytes，Pt／HGSS 基址分别 0x23000／0x26000，沿用 General 的 key／backup／prefer 选择两份分区。三种对战类型的记录以四字节 key 后每组 0x3DE 间隔定位，种类 1–493、输入 0–9999；保持种类 0、494、其他隐藏字节、key 与 footer。只有既有有效 Hall 提供种类记录编辑，不新增初始化行为。

常规代币以 Core `MaxCoins=50000` 覆盖 Designer 初值 65535；BP 0–9999、地下旗帜 0–999999。HGSS 计步器瓦特／步数 0–9999999，地图选择 0–2；全能竞技点数 GUI 0–9999999，但 Core 保存最多 99999，在预览中明确截顶。宝可表当前应用允许未选择 -1，其余为 0–24；解锁数量只读，修改应用旗标后重算，普通补丁保留其他非零原旗标 byte。普通计步器旗标补丁保留未显示的五位；来源全部获得操作沿用 Core 的 27 位完整掩码。

点阵源 `PoketchDotMatrix.Build` 使用 byte 亮度计数（256 次会回绕）、初始亮度映射及位或叠加旧画布。静态接入保留这些实际语义，不假定图片导入替换整张画布；转为纯 C# RGB 处理，在本地浏览器解码后传入 480×3 通道，拒绝错误尺寸、大小与超四种亮度，先显示结果再应用。浏览器解码能力与隐藏透明 RGB 保留能力属于平台限制，真实图像格式仍待外部浏览器核验。

所有编辑先验证源摘要、已知字段、完整范围、互斥操作与索引，再在副本生成冻结目标和实际变化。确认写入验证目标摘要及完整导出，保护原件，沿用工作副本与撤销。五布局扩展核心专项通过，包括来源批量、重复背景、塔回调场景、四边界像素、图片位叠加与 byte 亮度计数回绕；前端 7 项、定向 Lint 与类型检查通过。完整原生回归、verify（237 文件／895 项）、API 105 核心构建、裁剪后 26 类型属性检查与使用新核心的最终网页／PWA 打包通过；浏览器及实档待核验。

### 第四世代地下世界（API 106，工程检查通过）

已通读 `SAV_Underground.cs`、Designer 与 `SAV4Sinnoh` 地下字段。仅 DP／Pt，四类背包各 40 格：陷阱、家具、宝物为各 40 bytes；球体为前 40 bytes 种类、后 40 bytes 大小。DP／Pt 物品基址分别 0x42B0／0x4538，四类偏移 0／0x28／0x50／0x78，总长 0xC8。

窗口读取越界物品时展示空，越界球体同时展示大小零；家具／陷阱／宝物候选先过滤空资源再排序，保存身份必须映射原始资源索引。源保存先清四个区域，再跳过空物品和球体无法解析的大小，按顺序压缩；普通浏览不应触发这一归零／压缩行为，明确重新保存必须先预览。

球体大小列 `MaxInputLength=2`，保存使用 `int.TryParse` 后转为 byte，没有 0–99 的数值检查；两位带符号输入如 -1 会保存为 255，旧三位 byte 值也可被原样解析。实施时需分别表达新输入长度、符号／空值行为、实际保存值与旧值保持，不根据两位长度直接猜测储存上限。

十三项地下成绩 GUI 0–999999，DP／Pt 基址 0x3A2C／0x3CB4、总长 0x38；已用 UInt32 的偏移为 0／4／8／0xC／0x10／0x18／0x1C／0x20／0x24／0x28／0x2C／0x30／0x34，0x14 字段未被窗口使用，必须保护。成绩读取按窗口上限显示，源保存重写十三项；接入需保留未修改异常旧值，并把明确规范化与普通补丁分开。

API 106 接通完整四类背包及十三成绩，候选按当前语言资源排序但以真实 ID 操作。原始越界编号／大小／成绩保持读取，普通格位补丁不移动其他条目。球体大小文本由 C# 按整数解析后转 byte；空白或无效输入按明确操作清掉该玉格位，其他格位仍保持。普通改物品不重写未指定的大小；所有补丁必须先冻结预览并核对源／目标摘要。

重新保存单背包只处理该区，重新保存全部还将十三成绩截顶至 999999。背包重存按来源读取语义处理越界编号，按请求语言的原资源名字映射首编号，跳过空物品并压缩顺序；保留原件、另一分区与未使用的 0x14 成绩字段。前端切换语言时重建此编辑器，放弃旧语言草稿／预览，避免重复名称规范化出现语言混用。

球体新输入长度为 0–2；两位有符号数、正号或空格按来源整数解析。旧三位大小可保持原字符串，但不允许创建不同的三位新值。预览逐项显示实际成绩、格位、大小与原始数据变化，不在 JavaScript 另写转换或压缩算法。原生 DP／Pt 三语全部格位、十三上下界、压缩、符号／无效／空白／旧值、摘要、原件及完整文件专项通过；前端专项 7 项、定向 Lint、类型与完整 verify（238 文件／899 项测试）通过。全套原生、API 106 核心构建、裁剪后 26 类型属性检查及使用新核心的最终网页／PWA 打包通过，浏览器及实档待核验。

### 第五世代 C-Gear（API 107，工程检查通过）

已核对 `CGearImage.cs`、`SAV_DLC5.cs` C-Gear 导入／导出流程，以及 Core 的 `CGearBackground`、BW／B2W2 子类、`TiledImageConverter`、`PaletteColorSet` 与 `PaletteTileSelection`。图片固定 256×192、32-bit ARGB；Core 文件 0x2600 bytes，由 255 个 8×8 贴图（0x1FE0）、16 色调色板（0x20）和 768 项排列（0x600）组成。BW 后缀 psk、B2W2 后缀 cgb。

来源先识别排列中的调色板／索引是否为 shift 格式，再按目标游戏调用 `ConvertToShiftFormat<CGearBackgroundBW>` 或 `ConvertFromShiftFormat`；不能仅改后缀。未初始化判定为每个 byte 都属于零／FF（含二者混合），关闭导出，读取不初始化存档。`SetCGearSkin` 同时写额外区域及 footer、SkinInfo 校验／存在标记与 PlayerData 下载记录，不能只复制皮肤 bytes。`PlayerData.GetExtData` 返回下载标识 UInt16 与计数 UInt32，来源导入默认写 0xC21E／1。

PNG 导入先校验尺寸与 32bpp 格式，随后 Core 转换并写入存档，再调用 CheckResult 报告色数／贴图数量；容量提示不是导入前统一拒绝。PaletteColorSet 实际将颜色表限制为最先遇到的最多 16 色、忽略透明度，统计不能被解释为完整原图颜色总数。接入应使用 Core 返回结果及重新生成的图像预览，明确有损输出，不能自行另写量化算法或按假定色数截断规则拒绝来源可处理的图像。

API 107 在专用 Worker 接通读取、PNG 转换预览、psk／cgb 跨格式导入、原始皮肤导出及明确应用。当前背景与转换后的背景均来自 Core 渲染，以本地 canvas 显示；PNG 导出也只在浏览器中生成。接入层只交换 RGBA／BGRA 通道，图像贴图、颜色映射、翻转与两游戏排列转换均调用 Core，不复制算法。

PNG 文件先读取 33-byte 头核对 IHDR 与 256×192，再交给本地浏览器解码；文件上限 4 MiB，传输像素必须精确 196608 bytes。浏览器统一得到 RGBA，不复刻 Windows GDI 的 PixelFormat 分类，可接受浏览器可解码的 PNG。透明像素的隐藏 RGB、色彩管理与预乘还原可能不同于 Windows；像素变化数量对照浏览器解码后的输入，不作为 PNG 文件级无损证明。psk／cgb 输入必须精确 9728 bytes，按数据识别格式，不依赖后缀。

Core 返回色数受 16 色表截断，TileCount 也保留来源计数语义（未满容量时最后一个新贴图写入零起始索引）；UI 标注转换色数／贴图计数，不伪称原始图像完整唯一数量。转换后的图片、变化像素数、存档变化位置及皮肤校验／下载计数先冻结预览；超过来源容量检查仍允许明确应用来源结果。冻结摘要覆盖完整导出文件，确认时重新转换并比较完整文件摘要；原件、撤销、工作副本和完整导出沿用已有流程。

异常旧布局若 Core 不能渲染仍保留原始文件导出和替换入口，不在读取时规范化。未初始化关闭原始／PNG 导出；读取保留旧 HasSkin、下载记录与校验，即使它们与皮肤内容不同。前端切换或卸载时取消待返回的本地文件处理结果，防止把迟到的导入作用到其他界面。

前端专项 28 项通过；首轮原生请求因 System.Text.Json 转义 Base64 的加号超过 JSON 文本限制而失败，已将 JSON 上限改为 1600000 字符，解码后的输入与 Base64 长度上限不变。首轮 Lint 发现画布 effect 同步状态更新，已改为可取消的动画帧回调；修正后四版本原生专项、定向 Lint 与类型检查通过。Worker 为 Core 原生转换异常添加模块前缀并保留 cause，使错误按当前语言显示且保留诊断。全套原生、完整 verify（239 文件／904 项测试）、API 107 核心构建、裁剪后 26 类型属性检查及使用新核心的最终网页／PWA 打包通过，浏览器与真实存档待核验。

已通读 DLC 窗口其余分组的事件流程：PWT、音乐剧、对战录像、宝可电影、两份回忆链接、图鉴皮肤及对战测试均提供本地导入／导出。图鉴皮肤渲染、对战测试窗口显示来源尚未实现。Core 文件结构、尺寸与额外区域写入范围的源码记录见下节，夹具与接入待完成，本批 C-Gear 不代表完整 DLC 窗口已完成。

### 第五世代 DLC 其余文件（API 108，工程检查通过）

已读取 `SAV5.cs` 额外区域写入／footer 规则、`SAV5BW.cs`／`SAV5B2W2.cs` 对应布局，以及 `WorldTournament5`、`MusicalShow5`、`PokestarMovie5`、`BattleTest5`、`PokeDexSkin5`。API 108 接通以下文件功能，工程检查通过，不作为浏览器或实机验收证据。

| 分组             | 来源输入与格位                                                 | 实际写入及注意点                                                                                                                                              |
| ---------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PWT（B2W2）      | 3 格，pwt 0x1214 或 0x1314 bytes；后者调整到 0x1214            | 基址 0x7A000，间隔 0x1400；SetPWT 更新额外 footer 与 PlayerData，来源不刷新文件内 PWT 校验                                                                    |
| 宝可电影（B2W2） | 8 格，psm5 精确 0x4B4                                          | 基址 0x77000，间隔 0x600；SetPokestarMovie 更新 footer 与 PlayerData；来源 Name 仅返回 Empty／Movie，不能伪造可播放或完整电影元数据                           |
| 音乐剧           | pms：BW 0x1FC00，B2W2 0x17C00；另接受 0x17D78 并调整至目标长度 | BW／B2W2 基址 0x56000／0x55800，SetMusical 同步可用标记和下载记录；名字从文件名剥离编号、语言标签并截至 MusicalNameMaxLength，空文件清名字                    |
| 回忆链接         | 两份 ml5，各精确 0x400                                         | BW 基址 0x7F800／0x7FC00，B2W2 0x7E000／0x7E400；只调用 SetLink1Data／SetLink2Data，不额外创建下载 footer                                                     |
| 图鉴皮肤         | pds 0x6204 或 0x6200，短格式补零四字节                         | BW／B2W2 基址 0x76000／0x6D800；SetPokeDexSkin 写额外 footer、存在标记与下载记录，尾四字节改为存在值后再次刷新 footer；未初始化关闭导出，来源没有图像渲染实现 |
| 对战测试         | bt5 精确 0x5C8                                                 | 两布局基址 0x55000；非空导入设置 Magic=0x0D68 并刷新 0x5C6 前数据 CRC16，再调用 SetBattleTest；来源标记 Needs research，不宣称实机可用                        |

额外 footer 由 Core 写入：数据后 UInt16 count／CRC16，再在 `size + 0x100 - size % 0x100` 的对齐位置写 0x14-byte footer（包括校验的校验与 5.1 标识）。必须保护间隔余区。Core 的 PWT／电影 getter 与 setter 使用 `ThrowIfGreaterThan(index, Count)`，会错误接受等于数量的格位；接入层必须按窗口真实列表限制 0–2／0–7，防止写入相邻区域。

已通读 `BattleVideo5.cs` 与 `Musical5.cs`。录像 bv5 长度 0x18A4，四格；来源导入按 LCRNG64 常量识别解密状态，转回加密后对非空录像刷新 checksum，再调用 SetBattleVideo；导出原始／解密两种。读取／解密必须用副本，保护工作存档。录像四支队伍的 Core GetTeam 错用 0x44-byte Trainer 数据而不是 0x2A4-byte Team 区域，可能读不到成员或越界；后续读取应使用真实 Team1–4 片段及 Core InflateToPK5，限制六格并说明缺少版本／相遇来源等字段，不把还原体当作原始完整 PK5。音乐剧名字最大 20 字符，来源 MusicalTrash 由块内 0x208 起 42 bytes 储存，可用标记 0x29E。对应夹具仍待编写。

已继续核对 Designer 事件与 `Resources/text/lang_zh-Hans.txt`、`lang_en.txt`、`lang_ja.txt` 的八组标题。图鉴皮肤的前景／背景图片按钮没有 Click 接线，来源只实现整个 pds 文件导入／导出；不得把这些空按钮记作可用图片编辑功能。其余列表由窗口填充四录像、八电影及三 PWT，选中项回调为空，不增加来源没有的播放功能。后续分组标题采用以下资源，操作及提示仍按当前 UI 语言描述。

| 来源分组    | 中文             | 英文             | 日文           |
| ----------- | ---------------- | ---------------- | -------------- |
| BattleTest  | 对战测试         | Battle Test      | バトルけんてい |
| BattleVideo | 对战视频         | Battle Videos    | バトルビデオ   |
| MemoryLink  | 记忆连接         | Memory Link      | おもいでリンク |
| Musical     | 宝可梦音乐剧     | Musical          | ミュージカル   |
| PokeDex     | 宝可梦图鉴皮肤   | PokéDex Skin     | ずかんスキン   |
| Pokestar    | 宝可梦好莱坞     | Pokéstar Studios | ポケウッド     |
| PWT         | 宝可梦世界锦标赛 | PWT              | PWT            |

API 108 接通七分组、BW 九格／B2W2 二十格目录、全部来源尺寸及明确导入、原始文件导出、四格录像解密导出与冻结预览。C-Gear 沿用独立背景入口并提供关联跳转。保留原件、二十步／64 MiB 撤销、工作副本与完整导出；冻结目标覆盖完整保存文件，确认时重新执行来源处理并比较目标摘要。前端仅封装文件与 UI，尺寸调整、音乐剧名提取、加密、校验和额外区域写入均由 C#／Core 完成。

录像四支队伍每支最多六格，显示实际原始数量、训练家、真实格位图片、昵称、种类、等级，以及可展开的性格／特性／携带物品／训练家 ID／PID／个体值／努力值／招式与 PP。所有数据从实际 Team1–4 片段由 Core InflateToPK5 还原，说明不包含原本的版本／相遇来源等缺失字段，不作为原始完整 PK5 或合法性证明。异常种类或不可展示的成员保留原始编号和未知图像，不修改存档。

另核对 `PlayerData5B2W2.GetExtData` 仍错误限制到 HallOfFame，不能读取其自身定义、写入器支持的八电影／三 PWT 记录。接入层仅在这些来源字段按已核对的 `0x30 + section×2`／`0x5C + section×4` 读取 UInt16 标识与 UInt32 计数，不修改 vendor 或规范化旧值。PWT 的内部文件校验保留來源行为，不额外刷新；显示异常但允许来源支持的导入。对战测试非空时只按来源修改 Magic 与 CRC，明确实机状态待研究。图鉴皮肤只提供来源可用的 pds 文件操作，不伪装空图片按钮可用。

输入传输 Base64 最多 180000 字符，JSON 最多 1200000 字符；音乐剧文件名 1–1024 字符且不含 NUL，其余类型禁止混入名字。格位按实际列表验证（录像 0–3、记忆连接 0–1、PWT 0–2、电影 0–7、单格类仅 0），不沿用 Core 错误接受等于数量的边界。读取／导出只解析副本，导入对校验异常的工作存档关闭。

前端／客户端／领域专项 29 项、定向 Lint、类型与全仓格式通过。首轮原生在首版本文件／录像对照完成后因二十一字的夹具预期与来源二十字上限不符失败，已修正独立预期，四版本修正专项通过，并在全套原生中再次通过。初次全仓格式检查撞上下一编辑批次，报告一处 JSX；随后按最新文件格式化并通过全仓检查。完整 verify（240 文件／910 项测试、网页与 PWA 打包）、全套原生、API 108 核心构建、裁剪后 26 类型属性检查及使用新核心的最终网页／PWA 打包通过；浏览器／真实存档待核验。

### 第五世代 Global Link（API 109，工程检查通过）

已通读 `SAV_GlobalLink5.cs`／Designer、Core `GlobalLink5.cs`／`DateQuad5.cs` 及 BW／B2W2 Accessor。两布局都绑定块 35，基址 0x1D300、长 0x1AC，独立块校验位于 0x1D4AE，校验目录分别位于 0x23F46／0x25F46。窗口编辑主设置、二十组道具和五组家具，不发出网络请求。Global Link 标记仅代表存档内值，不代表恢复在线服务。

上传计数 GUI／Core 有符号 Int32 全范围；上传状态、三下载 byte 与选中家具 GUI 0–255。Core 选中家具只存低七位，同步标记为同 byte 的高位，普通修改必须保护另一个部分并在预览显示实际保存值；0x1AA／0x1AB 保留孔不可写。三状态 bool getter 读取任意非零值为 true，setter 写 0／1，未选择修改时保留异常旧非零值。

日期 Designer 明确 2000-01-01 至 2099-12-31；DateQuad5 四 byte 为星期、日、月、相对 2000 的年，IsValid 同时校验星期与日历。FromDateOnly 由 Core 生成四字段，取消设置调用 SetEmpty 清四字节；读取异常旧值不可自动改成今天或清空。

二十道具 ID 为各 UInt16（0xE4 起），数量为紧接四十字节后的二十 byte。来源候选为 GameInfo.FilteredSources.Items；数量文本 MaxInputLength=3、ValueType=byte，SaveData 采用 byte.TryParse，不能从三位长度推断 0–999。其 DataError 不抛出；[Microsoft CommitEdit 文档](https://learn.microsoft.com/en-us/dotnet/api/system.windows.forms.datagridview.commitedit?view=windowsdesktop-10.0) 明确先转换为单元格类型，成功才提交。接入数量按成功的 byte 值 0–255 验证，失败草稿不写入或偷偷归零。读取展示道具图片，不靠编号纯文字猜测身份。

五家具由 0x120 起、间隔 0x1A，前两字节 Value 0–65535、后二十四字节名称。Designer 未覆盖 TextBox MaxLength，按 [Microsoft TextBoxBase 文档](https://learn.microsoft.com/en-us/dotnet/api/system.windows.forms.textboxbase.maxlength?view=windowsdesktop-10.0) 默认允许 32767 字符输入；已进一步核对 StringConverter5 默认选项为 ClearZero，名称先截至十二 UTF16 字符，清缓冲区后写入并在空间允许时补 FFFF 终止符，性别符号沿用 Core 规范化。接入应区分 GUI 输入长度与实际保存结果，冻结预览显示截断／编码结果；未改名字与其尾随字节保持，改名时按来源清理。

已核对 FilteredGameDataSource／GameDataSource：普通候选来自目标存档 HeldItems 与对应版本／上下文字符串，再按 MaxItemID 过滤；不能把所有 UInt16 编号都当作新增候选或借用其他存档的全局列表。原始越界 ID 仍保留浏览。三语来源标题为宝可梦全球连接编辑器／Pokémon Global Link Editor／ポケモングローバルリンク，分组三语常规／道具／家具资源已读取。

API 109 接通三分组、六标量、四标记、明确日期设置／清除、二十道具与图片、五家具值／名称、整窗重新保存、冻结预览及确认应用。普通补丁只写指定字段，数量修改允许保留未知旧 ID，改 ID 必须使用目标存档真实候选；ID 零与数量非零可共存，沿用 GlobalLink5 语义，不套用背包的空道具清数量规则。标记改动才写 0／1，选中家具与同步标记分别保护其他位。上传宝可梦区域 8–0xE3、保留孔、其他模块及原件保持。

整窗重新保存按来源清空无效日期、规范非零标记、重新生成所有家具名称缓冲区；与普通补丁分开且先预览。原始日期／标记／家具数据、实际截断名称、低七位保存值及完整存档变化位置均可见。冻结摘要覆盖完整导出，确认再次执行转换并核对目标，沿用工作副本、撤销与完整导出。JSON 限 1100000 字符，名字按来源最多 32767 字符；数字输入支持符号／空白后的整数验证，不强加 NumericUpDown 未设置的字符上限。

前端／客户端／领域专项 30 项、定向 Lint、类型与全仓格式通过；四版本原生专项通过，原进程 23263 正常结束。核心夹具覆盖 Int32 两边界、全部格位、标记旧值、日期／闰日、名称截断／清理、源码候选、完整文件对照与原件保护。完整 verify 通过 241 文件／917 项测试及网页打包；全套原生、API 109 核心构建、裁剪后 26 类型属性检查和使用新核心的最终网页／PWA 打包均通过。外部 Chrome 仍未连接，浏览器与真实存档待核验；工程证据不作为项目所有者验收。

### 第五世代奖牌（API 110，工程检查通过）

已通读 `SAV_Medals5.cs` 与 Core `Medal5.cs`／`MedalList5.cs`，核对部分 Designer。仅 B2W2，Accessor 块 68：基址 0x25300、长 0x498，块校验 0x2579A／目录 0x25F88。前 255×4=1020 bytes 为奖牌，源 ml5 导入／导出只覆盖该区域；与记忆连接同后缀但长度不同，不能混用。0x3FC 置顶奖牌 0–254 或 255=None，0x3FD 等级 0–4，0x3FE 教程 bool，0x3FF 保留。

奖牌前两字节日期位为 yearSince2000 七位／月四位／日五位；GUI 日期 2000–2099、支持当前文化或 yyyy-MM-dd。状态三位只有 0–4 五候选，第三 byte 位 3 为未读，高四位及第四 byte 未使用。Core State setter 实际保留未读位但清高四位，接入需明确源副作用及保留策略，不能不经预览抹去未知数据。RawDate 非零但无效时 Date getter 会抛出，旧状态 5–7 也会超出来源名称数组，读取必须保存异常原始值而非修复或崩溃。

状态 HintObtained／Obtained 可有日期，ObtainReady 仅旧 RawDate 非零时可有日期；改变状态后若可有日期但没有日期，来源自动用 EncounterDate.GetDateNDS。GiveAll 只填未获得的奖牌并保持已有日期／未读，最后按 255 数量将等级设 Legend；单独等级计算按实际获得数以 50／100／150／200 分档。需冻结批量操作日期，不在确认时偷偷改成下一天。

栖息地由块内 0x400 起、长 0x96，前 0x36 bytes 不用；九十格各一 byte，Grass／Surf／Fish 各两位 0–3，完成标记为 bit6，bit7 保留。普通 setter 保留其他位；SetComplete 写 0x7F、Clear 写零，明确批量才沿用整 byte 行为。完成按钮在没有 SelectedRows 时完成全部，清除通过选中行或选中格位所属行处理，需分别表达范围。0x90 UInt16／0x92 byte 未知字段，Designer 分别限定 0–65535／0–255；0x93 最后遇敌 0–2、0x94／0x95 两教程 bool，剩余两对齐字节不改。

已核对 `medals_b2w2/text_medals_<language>.txt` 与 `text_medal_types_<language>.txt`：中文／英文／日文均为 255 名与五类型；窗口三语标题、五状态、五等级、四完成度、三遇敌类型资源已定位，中文正式标题为奖牌编辑器，使用来源奖牌名称。`EncounterDate.GetDateNDS` 从 TimeProvider.GetLocalNow 取本地日期，输入日期验证使用 2000–2099；不能假定其取日方法自身截顶年份。来源日期解析先 trim，接受当前文化或 yyyy-MM-dd，日期可编辑时拒绝空文本。GUI 读旧数据时没有防护非法日期／状态数组越界，接入应只读保留并显示原始值，修改仍按明确字段完成。源码边界与资源已核对，实际实现与验证见下文。

Medals5Editing.cs 已实现完整块读取、三语名称／类型、明确补丁、全部给予、等级计算、明确栖息地范围、精确 ml5 导入导出和完整文件冻结预览。普通状态修改按 Core setter 清高四位，在原始字节与完整变化预览中体现；不额外恢复高位而偏离来源行为。未指定状态／日期、字节 3、块内未使用区域、设置及对齐字节保持。批量完成／清除明确给出格位列表，避免网页选择与 WinForms 隐式选中行规则混淆。已获得奖牌的全部给予跳过规则由 Core 执行。

自动日期由预览阶段记录进冻结请求，确认不得重新取日期。日期补丁采用 HTML 日期所用的规范 yyyy-MM-dd，严格日历与 2000–2099 范围；未改无效日期保留并显示原始数据。修改日期前按应用后的状态判断 CanHaveDate；状态切换后的自动日期和明确日期采用来源顺序。新等级／上次遇敌值分别限制 0–4／0–2，未知旧值仍能读取，不受无关补丁影响。请求限 100000 字符，ml5 Base64 精确 1360 字符／解码 1020 bytes，与记忆连接的同后缀 1024 bytes 明确区分。

B2／W2 原生专项通过全部格位、五状态、日期边界、异常原值、八设置、等级十边界、源批量／导入与完整文件对照、原件／相邻区域保护、冻结日期和拒绝原子性；接线后的前端／客户端／领域 32 项专项、定向 Lint 与类型通过。API 110 已接 JSExport／Worker／三语界面；完整 verify 通过 242 文件／926 项测试及网页／PWA 打包，全套原生、核心构建、裁剪后 26 类型属性检查与使用新核心的最终网页打包均通过。外部 Chrome 尚未恢复，浏览器／真实存档待核验，工程证据不作为项目所有者验收。

产品入口分奖牌／栖息地／常规设置，255 个名称与 90 个真实格位用共享 Select；普通字段补丁与明确勾选／全部范围的批量操作分开。日期输入为原生日期控件，允许空显示保持旧原始值，但用户清空日期草稿不等于删除日期：来源不提供日期清空操作，新的空日期提交拒绝。数字未知字段保持 NumericUpDown 无字符上限，范围分别 0–65535／0–255，拒绝无效草稿。异常等级／遭遇类型仅提供不可新增的原值候选；无关修改不规范化。应用前列出各奖牌、栖息地、设置和完整原始块的实际变化，明确状态与批量操作的保留位副作用和冻结日期。

### 第五世代 Misc（API 111，工程检查通过）

已通读 `SAV_Misc5.cs`，核对 Designer 的显式范围及 Core Record5／BattleSubway5／BattleSubwayPlay5／Entralink5／EntreeForest／EntreeSlot／Musical5／WhiteBlack5 与两份 Accessor。常规、对战地铁、连入之森、连入、音乐剧配饰、记录和 BW 黑城／白森林文件均属于窗口范围；B2W2 另有钥匙、三种 Pass Power 与 Funfest，不应合并成仅训练家字段的简化入口。三语资源、全部块位置、Festa 余下方法和随机候选完整数量仍待核对。

- 飞翔 BW 从 0x204B2 起、16 个实际映射；B2W2 从 0x20392 起、24 个映射，Victory Road 使用 bit66，必须保护其余位并处理首 UInt32 之外的目标字节。BW 游走新状态只有 Defeated／Captured 或当前状态；从 Roaming 改走会清所对应 Roamer 数据及 State2C。剧情工作值候选 0／1／3。B2W2 五钥匙分别获得／解锁，保存只调用实际改变的 setter。
- 对战地铁当前类型／对战数为 byte，GUI 0–255；八路线各 past／record 为 UInt16，但 GUI 0–9999；当前组 setter 使用 past/7+1 或零。来源窗口将 Flag3 和 Flag7 绑到同一 CHK_Subway7，读取后以后者覆盖，保存时二位同值，需要明确该来源联动，不能擅自当作两个独立来源控件。
- 连入两个等级 GUI 0–999；Funfest 四统计与两项成绩 0–9999、最多参与者 0–255，任务等级候选 0／1／2／3／7。经验 Designer 默认 0–49 后由 GetExpNeededForLevelUp(level)-1 联动；源 SetNudMax／SetEntreeExpTooltip 在 isBlack=true 时直接返回，黑侧变化不能凭一般公式推断成已实现联动。需继续核对 Core 经验公式、所有任务解锁及旧数据保持。
- 连入之森 Core 长 0x850、530 个四字节格位，前 0x84C 以末尾 seed 加密；读取格位会解密，保存需 EndAccess／EnsureDecrypted(false)。最深处二十格、第九区三组各十格、第一至八区各三组二十格。解锁区 GUI 2–8 映射 Core 0–6、第九区 bool，动画 0–7，种类／招式／形态／性别必须核对目标存档候选。种类 setter 清未使用 bit10，不能根据注释误认为完整十一位种类字段。随机森林逐次移除候选，需先确认候选足够并冻结实际结果。
- 音乐剧 100 配饰位从 0x258 起，逐位修改保护末字节高四位；名称及 DLC 已由其他入口负责。BW fc5 精确 0x1E8，只覆盖 ForestCity，不把 B2W2 合体宝可梦块当成对应文件。
- Record5 长 0x1E0，前四字节 revision、末四字节 seed；中间记录区域加密。68 个 UInt32 与 100 个 UInt16；GUI 编号 0–67／0–99、值 0–4294967295／0–65535。Core SetRecord32 实际截到 999999999，SetRecord16 上限 65535；读取会解密，保存必须 EndAccess，未指定的超常旧值及 revision／seed 保持。

Misc5Editing.cs／Misc5Forest.cs／Misc5Subway.cs 已实现这些目录与明确补丁，Misc5Text.cs 的窗口、Pass Power 与任务标签来自固定版本三语资源；飞翔名称从原始 bw2 地点资源取三语对应位置。不能用 Util.CachedStrings 里的英文名称反查，GameStrings 的初始化会在共享数组内修改 Victory Road／PWT 等名称；接入使用独立原始字符串表，未修改 Core 缓存。

记录与森林在访问后显式结束解密，写出回读复核格式、版本、长度、校验及所有涉及块；普通补丁只写指定字段。对战地铁 past 修改保留原当前／过去勾选语义，明确 active 补丁在 past 后执行，因此请求行顺序不改变结果；Flag7 补丁沿用来源同时写 Flag3 的副作用，其余未指定标记保持。白侧等级变化沿用来源对双方经验上限的重算与截顶，黑侧等级单独变化不擅自增加 source handler 提前返回后的联动；同批白侧等级与经验按目标范围验证。

来源探针确认森林候选 BW 651／B2W2 578，全部 45 个 Funfest 的解锁条件都存在，原来的按注释数行推断已撤销。UnlockAllFunfestMissions 仍按来源循环至编号 43，不含编号 44，不能把按钮名称当作所有 45 项都已解锁的证据。随机森林保留当前动画，按來源移除所抽候选并选招式／性别；原种类保留 bit10 由來源 setter 清理，在原始变化中显示。预览固定 530 个实际来源编号及原始值，确认验证编号唯一、来源种类／形态／性别／招式、旧动画与目标完整文件摘要，再应用同一结果，不重新随机。

请求文本上限 150000 字符；fc5 解码精确 488 bytes，全部森林最多 530 个明确补丁、记录按各自真实范围、任务最多 45 行且等级候选 0／1／2／3／7。新种类／招式来自目标存档 FilteredGameDataSource，形态与性别来自 Gen5 FormConverter／PersonalTable；不把未知旧数据当新候选，未指定字段保留。修改种类时前端明确提交对应首形态／性别候选，不以普通补丁的原值保持替代产品联动。

B／W／B2／W2 核心专项通过上述范围、全部格位、来源完整文件对照、冻结随机、原件保护及拒绝原子性。补 1000 个 Core 经验上限、种类对应形态／性别候选及来源解锁全部配饰行为后的四版本扩展专项也通过。API 111 已接 JSExport、Worker 和三语 UI；前端／客户端／领域 31 项专项、定向 Lint 与类型通过。完整 verify 通过 243 文件／934 项测试及网页／PWA 打包，全套原生、核心构建、裁剪后 26 类型属性检查和使用新核心的最终网页打包均通过，含未知森林字段及超常记录保护夹具。浏览器／真实存档待核验，工程结果不作为项目所有者验收。

复核 `B_UnlockAllProps_Click` 确认该批量按钮直接调用 UnlockAllMusicalProps，实际清末字节高四位；原先只逐位置真会遗漏来源副作用，已改为来源方法并修正独立对照。普通配饰补丁仍逐位保护保留位。窗口、分组和已有操作使用固定资源标签，源硬编码钥匙操作补三语描述，种类／招式按当前语言显示与排序，实际编号始终保持。普通字段、八条路线、记录、任务与各森林区域分别选择；新种类会明确提交对应首形态／性别，未知原值只能保持或替换。

经验上限由 Core 按 0–999 等级返回，前端不另写游戏公式；同批白侧等级改变的输入限制从该表取值，黑侧未改超常等级沿用现有上限。普通数值和任务成绩没有新增 NumericUpDown 未设置的字符上限，空文本离开恢复原值，非法草稿拒绝而不改零。空种类的性别显示占位符，避免把源编号零解释为雄性。原始 fc5 导出独立于工作副本输出，上传在读取前核对精确 488-byte 大小；全量门禁后仍需外部浏览器与真实存档核验。

### 第五世代联合塔（API 112，工程检查通过）

已通读 `SAV_UnityTower.cs`、Core `UnityTower5.cs`／`LocaleNDS5.cs`、ComboItemUtil，并核对两份 Accessor 与 Designer。BW／B2W2 实际均绑定块 29：基址 0x19600、长 0x1338、块校验 0x1A93A，目录 0x23F3A／0x25F3A；B2W2 表中的块 62 虽标注 Unity Tower，但不是该编辑器绑定的数据。CountryCount 为 232，日本编号为 105，不能复用第四世代常量。

楼层从相对 0x320 起按国家编号 bit 读写，0x344／0x345 为两个 bool 字节，地球仪从 0x348 起，每国家十六字节、每地区两位。普通 setter 保护相邻位，两个 bool 非零读取为真、显式写入规范为 0／1。GeonetPoint 只有 None／Blue／Yellow／Red 对应 0／1／2／3，菜单文字来自三语 MessageStrings；没有自由数值输入，不需要数值文本框或按假定地图推算编号。

国家／地区资源由 Util.GetCountryRegionList 解析三位实际编号并按当前语言排序；窗口用 ComboItem.Value 访问数据，不能把排序后行号当编号。无细分地区的国家只呈现资源默认编号零，有细分的国家使用真实地区编号。CSV 已包含中／英／日列，GeoLocation.GetLanguageIndex 分别为 6／1／0。完整目录共 616 个真实地点，专项以独立来源目录核对全部编号、地区端点和三语排序。

保存先 ClearAll，再逐行写点与楼层，最后 SetSAVCountry 将自身国家／地区点标为 Red，然后写两标记。SetAll／SetAllLegal 仅修改各自范围并标自身位置、设两标记为真；ClearAll 清 1–232 的来源地区与楼层，再标自身位置，GlobalFlag 依自身国家是否非零且非日本决定，UnityTowerFlag 清零。其他保留区域不会整块清零。旧无关地区与未呈现编号需区分普通补丁和来源整窗重新保存，先预览实际变化。

Core SetSAVCountry 不检查来源国家／地区是否在有效目录或物理位范围，接入按实际可写布局验证：国家为零不写点，非零国家 1–255／地区 0–63 均处于对应十六字节槽；国家 233–255 或未列出的地区虽不在 GUI 目录内，但可安全写入，不能凭目录限制缩减来源可保存的旧位置。地区 64–255 会跨槽或越界，读取保持并显示，拒绝编辑。不给存档信息自动改国家／地区。

UnityTower5Editing.cs 已接 API 112、Worker 和中／英／日界面；目录逐项核对得到 616 个真实地点和 232 个楼层，三语资源按编号合并，显示再按语言排序。普通明确补丁只改所选点／楼层／标记并 SetSAVCountry，自身点最后由 Core 重设 Red；未指定旧 bool 字节、非目录点、楼层保留位、问卷区和对齐字节保持。三个批量直接调用来源方法，独立重新保存按 ClearAll／可见地点／楼层／自身点／原勾选标记的源顺序执行，规范化先预览。

输入为实际目录候选、点 0–3 和布尔，无数值文本宽度或空数值推断。请求限 150000 字符，地点补丁最多 616 项、楼层最多 232 项，拒绝重复或混合批量字段。完整导出摘要冻结预览，确认再次执行并核对目标；输出复核格式、版本、长度、校验和完整 0x1338 块。界面使用共享 Select 和 44px 操作区，草稿／预览阻止切换，所有下拉显式禁用；不把自身位置强制红色隐藏为保存后的意外变化。

B／W／B2／W2 核心专项已通过全部地点四编码、楼层两值、三语编号、保留位／异常标记、来源批量与整窗保存、未知安全／不安全自身位置、原件、冻结及完整文件对照。前端／客户端／领域 30 项专项通过；完整 verify 的 244 文件／941 项测试及网页／PWA、全套原生、API 112 核心构建、裁剪后 26 类型属性检查和新核心最终网页／PWA 打包均通过。外部 Chrome 入口仍不可用，浏览器／真实存档待核验。

### 第五世代汇合大道（API 113，工程检查通过）

已读取 `SAV_JoinAvenue.cs`、ListEditor 的读写／导入导出流程、Core JoinAvenue5／IJoinAvenueEntity5／JoinAvenueDate5，初步核对 Settings5 和 Designer 显式限值。仅 B2W2；Core 固定访客 8、粉丝 12、店铺成员 8、助手 4，另有 Self。访客从块内 0x08、粉丝 0x62C、店铺成员 0xAAC、助手 0x10CC、Self 0x122C、ScriptFlag 位于 0x12F0 bit0、Settings 从 0x12F4 长 0xEC；访客／粉丝计数为独立 UInt32，不用它们决定可寻址格位数量。

来源 ListEditor 切换格位会保存当前对象，导出前也保存当前；读取后名字 Trim 空白仅用于显示标签，不应据此清理存储名字。导入按精确实体大小识别访客／粉丝／助手，调用 destination.CopyFrom：同类型用各自复制器复制完整实体，不同类型复制共有字段，不能一概按原始字节覆盖。跨类型转换不复制 IsInteractedToday，保留目的类型专属数据；全部编辑器保存顺序仍待核对。

Settings 名称／称号输入二十字符；源 General 姓名七字符，喊话／招呼／告别八字符。大道等级 GUI 0–9999、经验／Flags／Seed UInt32 全范围，宣传天数 UInt16，访客数据库计数 GUI 0–32、插入位置 0–31。Core 的 32 个访问者 ID 位于 settings 0x54，占 0x80 bytes，空值 0xFFFFFFFF；Count setter 截到 32，Insert setter 对 32 取模。SettingsEditor 已核对，直接读写全部 32 组 TID／SID，不调用 AddPlayerVisitor；该方法更新 count 两次而未更新插入位置的代码不能当作窗口的新增操作。数据库 ID 空／解析失败按 UInt16.TryParse 兜底零，其格列宽度与提交规范仍需进一步核对。

三类大小与后缀已核对：Visitor 0xC4 jav5、Fan 0x60 jah5、Assistant 0x58 jaa5。General 的国家／地区 byte 0–255 为原数值输入，不能把 Trainer 地理候选范围强加到该控件；Unknown22 0–15 与性别共用半字节，游戏时间为小时 0–1023／分钟 0–63，TID／Sprite 0–65535，MetYear／Month／Day 各 0–255 原 byte，不能直接替换成日历日期控件并拒绝来源允许的 byte。版本来自目标游戏 FilteredSources，语言来自 Gen5 LanguageDataSource，性别控件自身的未知值与切换规则仍待读取。

JoinAvenueDate5 为独立 UInt16 年／月／日格式，年 2000+七位，月四位、日五位，空值零；Date getter 对无效年月日返回 null，Date=null 清零。不可复用奖牌日期位布局。SaveBlockAccessor5B2W2 实际绑定块 67：0x23C00，长 0x16A8，块校验 0x252AA，目录校验 0x25F86。Fan 的今日互动 setter 将整个 0x4F 字节改为 0／1；Assistant 读取 0x33 bit0，但 setter 也重写整个字节，须区分普通保留与明确规范化。

已通读 General、Visitor、Fan、Assistant、Settings、ListEditor 与主窗口保存流程，核对全部 Designer 显式上下界、三种实体及 StringConverter5。新增 Avenue5Editing／Fields／Parsing／Text，读取 35 个对象（大道、设置及 33 个角色），明确字段补丁、当前对象来源重新保存、三类文件同／跨类型导入导出和完整文件冻结预览；API 113 接 JSExport、独立 Worker、三语浮动面板。界面中文标题沿用来源“汇合大道编辑器”，不保留此前文档中的非来源译名。控件翻译在来源资源实际挂在 SAV_JoinAvenue 名下，不能误按子控件类名读取而回退英语。

| 范围       | 核对的输入／保存行为                                                                                                                                                            | 上游依据                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 共有资料   | 姓名 7，喊话／问候／告别 8 个 UTF16 字符；国家／地区和三个原始日期 byte 均 0–255；Unknown22 0–15；TID／Sprite 0–65535；时间 1023／63；Seed UInt32                               | EntityGeneralEditor.cs／Designer、三种实体与 StringConverter5                               |
| 性别／候选 | GenderToggle 读取大于 2 的值显示 2，只能切换 0／1；普通未指定旧性别保留，明确重新保存才截到 2。版本为目标存档 FilteredSources.Games，语言为 Gen5 候选，宝可梦为目标存档过滤列表 | GeneralEditor、Controls/PKM Editor/GenderToggle.cs、FilteredGameDataSource                  |
| 访客／店铺 | AvenueLevel 127、DexSeen 1023、ShopRank 10；八未知 byte／计数为 255；经验／工作 UInt16；库存／UnusedB8 UInt32；packed 未知段 511／7／255／127／15 与独立 bit9                   | VisitorSpecificEditor.cs／Designer、JoinAvenueVisitor5                                      |
| 访客列表   | 八店铺计数截到 15，八记录 UInt32，十六 Trivia 和四活动截到 255。逗号／分号／竖线／换行分隔，去空白和空项，缺少或无效项补零、多余项忽略，允许 0x HEX                             | VisitorSpecificEditor.ParseByteList／ParseUIntList／Split／TryParseUInt                     |
| 日期文本   | 空或无效文本取零，先尝试 UInt32 十进制／HEX 并截到 UInt16，再尝试 invariant 日期；三日期及四活动日期沿用原解析。日期列表空项被忽略，普通未指定日期保留                          | VisitorSpecificEditor.FormatDate／ParseDate／ParseDateList、JoinAvenueDate5                 |
| 店铺元组   | 类型 None 或八种，等级编号 0–9，版本编号 0–3。EncodeShop 与 DecodeShop 的乘数不对称，直接使用 Core 原 setter，并预览实际结果，不另写假定可逆编码                                | VisitorSpecificEditor.GetShopTuple／SetShopTuple、JoinAvenueVisitor5.EncodeShop／DecodeShop |
| 粉丝／助手 | 粉丝七个 byte／气泡目标 0–255、Unknown52／5A UInt16，种类来源候选；助手四位置 byte。今日互动显式写入按各 Core setter 规范化整个相关 byte                                        | 两份 SpecificEditor／Designer、Fan5／Assistant5                                             |
| 大道／设置 | 两角色计数 UInt32，ScriptFlag 保留邻位；名称／称号 20，等级 9999，经验／Flags／Seed UInt32，宣传天数 UInt16，ID 数据库数量 32／插入位置 31、32 组 TID／SID                      | SAV_JoinAvenue／SettingsEditor.cs 与 Designer、JoinAvenueSettings5                          |
| 数据库文本 | 两 ID 列无显式输入字符数，保留 WinForms 文本默认 32767 限制；UInt16.TryParse 空／失败取零，单列修改保护另一半 ID32；不调用 AddPlayerVisitor                                     | SettingsEditor.cs／Designer、DataGridViewTextBoxColumn 默认行为                             |

共有资料修改按来源保存顺序执行：Name／Shout 使用旧语言，之后更新语言，Greeting／Farewell 使用更新后的语言；请求字段顺序不影响此顺序。普通补丁只写指定字段，跨类型导入先写字符串再复制来源语言，直接沿用 CopyFrom。导出提供存储实体的精确字节；来源窗口导出前隐式保存的规范化改为独立“按窗口规则重新保存”预览，禁止带未应用草稿直接导出。Self 不提供来源没有的导入／导出按钮。原件保持、工作副本、撤销及完整存档导出沿用现有链路。

请求上限 300000 字符，角色文件精确 196／96／88 bytes、Base64 最多 264 字符；拒绝重复字段、未知字段、越界格位、混用请求和陈旧完整文件摘要。确认重新执行后核对冻结目标，输出验证格式、版本、长度、全部校验和完整汇合大道块。全部 NUD 未设置 Hexadecimal／DecimalPlaces／Increment，沿用十进制整数与步长 1；空数字编辑结束恢复已读取值，文本／列表／日期空值按各来源解析，不统一视作数值零。

B2／W2 核心专项通过全部 35 对象、33 角色地址、所有导入类型组合／精确导出、语言保存顺序、packed 位／旧数据、列表／日期解析、360 种店铺元组、各类来源重保存、原件及完整文件冻结／原子性对照。前端／客户端／领域专项 32 项通过，完整 verify 的 245 文件／950 项测试及网页／PWA、全套原生、API 113 核心构建、裁剪后 26 类型属性检查和新核心最终网页／PWA 打包均通过。外部 Chrome 尚未恢复，浏览器／真实存档待核验，不把工程检查当作所有者验收。

### 第六世代 X／Y 树果田（API 114 来源读取，工程检查通过）

已通读 SAV_BerryFieldXY.cs、Designer 和 BerryField6XY.cs，核对 SaveBlockAccessor6XY。来源窗口仅在选中格位时读取八个 UInt16 并显示，没有保存回调；B_Save.Enabled=false，明确显示 Unfinished - Needs More Research。Designer 列表包含 36 项，Core.Count 为 32，GetPlot 对编号 32 及以上抛出异常，不能因 GUI 多列四项就放宽可访问范围。

实际绑定块 40，基址 0x1B800，长 0x390；格位从块内 0xC 起，每格 16 bytes，Core 可读 32 格。每格八个 UInt16 little-endian，第一项来源标为 Berry，其余 1–7 未知。全部文本框在 Designer 标为 ReadOnly，只有格位选择，无数据输入范围或空值写入行为；UInt16 显示完整 0–65535 十进制，格位实际编号 0–31、界面 01–32。

新增 BerryField6XYReading、BerryField6XYViewer 和读取领域守卫，API 114 接 JSExport、独立 Worker 与浮动存档面板。Core 调用 GetPlot，读取八数值及精确十六字节，同时返回完整原块与源摘要。没有编辑／保存／导入动作，Worker 明确拒绝带编辑 payload 的只读请求；不把可分配字节、ORAS 相似布局或文本框推断成 X／Y 已确认的编辑功能。中文“树果园查看器”、英文 Berry Field Viewer、日文标题及未完成提示按来源三语资源提取，其余未知字段用当前语言的明确描述。

X／Y 原生专项通过全部 32 格／256 个 UInt16 地址、0／1／255／256／32767／32768／65534／65535、完整原块的头部／尾部保护、精确格位字节、源摘要／原件不变与完整导出，并拒绝 ORAS／B2。前端守卫拒绝误列的第 33–36 格、异常布局／数值／摘要／可编辑元数据。前端／客户端／领域专项 28 项通过；完整 verify 的 246 文件／955 项测试与网页／PWA、全套原生、API 114 核心构建、裁剪后 26 类型属性检查和新核心最终网页／PWA 打包均通过。外部 Chrome 尚未恢复，浏览器／真实存档待核验。

### 第六世代名人堂（API 115，工程检查通过）

已读取 SAV_HallOfFame.cs、HallOfFame6／HallFame6Entity／HallFame6Index，并初步核对 Designer、两版 Accessor。X／Y 与 ORAS 均绑定块 36，16 支队伍，每队 6 个 0x48-byte 成员及末尾四字节索引，队长 0x1B4。第一次通关记录不可删除；删除 1–15 沿用 ClearEntry 向前移动后续记录并清空最后一队，不能只清选中队伍。

来源候选使用当前存档过滤种类／持有物／招式，形态按 FormConverter 和 PersonalTable.AO；昵称／训练家姓名十二字符，EC 八位 HEX，成员选择初始 1–6，窗口按非零种类数量动态缩小最大值。日期控件 2000-01-01 至 2050-12-31；Validate_TextBoxes 将等级截到 100、通关编号截到 byte.MaxValue=255、TID／SID 截到 UInt16，并格式化三／三／五／五位。不能以 Core.MaxComplete=9999 替代实际 GUI 的 255 写入规则。

成员 offset 0x14 的 packed UInt32 依次为形态五位、性别两位、等级七位、异色一位、自定义昵称一位、训练家性别一位；其余位未知。昵称／训练家姓名实际位于 0x18／0x30，各 24 bytes，setter 清零对应区域；Ctrl 废字节处理仅绑定 TB_Nickname.MouseDown，实际处理 0x18 起二十六字节，最后两字节包含训练家姓名首字符。索引字段为通关十四位／年八位／月四位／日五位／HasData 一位；无效旧日期保留读取，不能直接调用 DateTime 构造导致整个目录失败。

已核对全部 Designer 输入与事件、Util.ToInt32／GetHexValue、StringConverter6、Text.cs／Designer 废字节工具和两份 Accessor。XY 基址 0x19400、ORAS 基址 0x19E00，块长均 0x1B40。TB_Level／TB_VN 为三位必填数字掩码，TID／SID 为五位；空／空格／提示符通过来源解析取零，负号不是掩码可输入字符，网页与 Core 明确拒绝。EC 文本八字符，Core 跳过非 HEX 字符解析，不按占位符推断输入范围。日期严格按 GUI 的 2000–2050，不扩大到 packed 八位年的所有值。

重新保存复现来源加载掩码与规范化：旧通关编号先按 ToString("000") 写入三位掩码，超三位截取前三位，再截到 255；例如 1024 保存成 102，不只按 Math.Min(255,1024) 推断为 255。等级截到 100，旧性别 3 的显示规范为 2，未知持有物／招式空候选写为零，昵称和训练家姓名分别通过 Core 清对应字节。源 Write_Entry 重写整个当前成员及队伍日期／HasData；普通明确补丁保护未指定旧字段，来源重新保存另设预览。不可加载的旧日期／种类／形态只读取，普通局部修改可修复其字段，重新保存需要先修复到来源可加载值。

Source 成员输入范围按非零种类数量动态设为 1–count，count=0 时为 1；即使中间有空格位也不按最后非空索引扩张范围。接入保留六个真实成员图像／读取，仅对 HasData 且成员位于该前缀范围的格位允许修改。未自定义昵称时，种类或昵称标记变更联动当前存档语言的种类名称；双性别支持 0／1 与有性别标记形态、火炎狮形态联动。固定性别的源回调提前返回而不写成员，不能凭“设成正确性别”增加来源没有的写入。

废字节完整接入来源准备、26-byte HEX、文本、清尾与种类名称层。打开准备使用当前昵称和 StringConverterOption.None 写入 26 bytes，十二字符昵称会清训练家首字符，必须在预览呈现。文本变化按 TrashEditor.Show 的顺序触发当前成员来源重保存，再覆盖 FinalBytes；仅尾部变化不擅自重保存。文本最多十二字符、原始 HEX 精确五十二字符；种类使用未过滤 GameDataSource 全列表，语言使用 Gen6 列表，名称层由所选种类／语言／世代构造，隐藏或超过 26 bytes 的层拒绝。世代 NUD 未显式设置限值，沿用 [NumericUpDown 默认范围](https://learn.microsoft.com/en-us/dotnet/api/system.windows.forms.numericupdown.maximum?view=windowsdesktop-10.0) 0–100；字符候选从 Text.cs 的 Gen6/7 私有字表逐项提取，排除不可输入的 E08A–E08C。

新增 HallOfFame6Editing／Hall6TrashEditing、字段领域层与三语图像编辑器，API 115 接 JSExport／独立 Worker／浮动存档面板。提供全部字段、来源重新保存、删除移动、特殊字符、废字节及当前语言队伍文本复制。全部写入先完整文件摘要预览，确认核对冻结目标；重解析验证格式、版本、长度、校验和完整块。X／Y／OR／AS 原生专项及扩展专项通过全部 16×6 地址、来源掩码／联动、十五种删除位置、26-byte 边界、文本／种类名称层／世代端点、旧值规范化／孔位、完整原件／导出对照及拒绝原子性。前端／客户端／领域专项 32 项通过，完整 verify 的 247 文件／964 项测试与网页／PWA、全套原生、API 115 核心构建、裁剪后 26 类型属性检查和新核心最终网页／PWA 打包均通过；浏览器／真实存档待核验。

### 第六世代 Pokémon Link（API 116，工程检查通过）

已通读 SAV_Link6.cs，核对 Designer 显式输入、LinkBlock6、PL6 主存储字段及两份 Accessor。X／Y 与 ORAS 实际均绑定块 48，基址 0x1FE00／0x20E00，长 0xC48；PL6 从块内 0x1FF 起，精确 0xA47 bytes。导入按精确尺寸复制 Gifts.Data 后重新读取控件，导出直接写当前 Gifts.Data，不调用 SaveLinkData；正式保存才写界面字段并 RefreshChecksum，再复制工作副本。

来源文字 54 字符，110-byte 区域按 StringConverter6 清零写入；BP GUI 0–9999，Pokemiles 0–65535，六数量 GUI 0–65535，但 SaveLinkData 显式先 cast byte 再赋 UInt16，因此按低八位写入，不能把 Core UInt16 或“看似合理的数量上限”替代该源行为。道具使用当前存档 FilteredSources.Items；六个宝可梦字段仅显示种类，窗口没有宝可梦编辑回调。Enabled getter 读 Flags bit7，setter 重写整个 byte 为 0／128，普通未指定 flag 应保持。

LinkBlock6 的内部校验为 CRC16_CCITT(Data[0x200..^4])，结果写 Data[^4..]；它与外层存档块校验分别处理。该校验排除块内 0x1FF 的 Enabled 字节，PL6 切片包含内部校验字节。正式保存、原始 PL6 导入与只读导出的校验时机必须区分，不应为了导出自动规范化未保存内容。

Designer 永久禁用来源、启用勾选、六道具候选和六数量输入，六宝可梦文字框为 ReadOnly；LoadLinkData 只在 Enabled 为真时打开 BP、里程和导出。产品按这些真实可用控件接入，不能将存储字段误当作窗口支持的直接编辑。显示全部六道具／六宝可梦本地图像、三语种类／道具名、完整 UInt16 数量、原始标记与内部校验；BP／里程分别为四／五字符十进制，空输入表示保留旧值，有效范围由领域和 Core 两侧验证。异常旧 BP 大于 9999 仍可读取，重新保存前须明确修正。

普通补丁只写已指定的 BP／里程并刷新内部校验，保护未指定的来源、标记、道具与实体；整窗重新保存单独执行来源规范化，包括名称清零、Enabled 重写、道具候选缺失转 UInt16 65535、数量 cast byte 及内部校验刷新。所有写入必须先预览，再核对完整源／目标 SHA-256 后确认应用；显示来源、标记、数值、道具、实体、内部校验和完整存档变化字节。原件、撤销、完整工作副本导出保持。

原始 pl6 导入精确 2631 bytes，不自行修复文件内部校验；外层存档校验随工作副本写入更新。可在确认前查看导入图像／原始字节，并另行预览整窗重新保存。独立导出路由直接取当前原始 PL6，不包含草稿、预览或窗口重保存副作用；禁用记录保持来源导出限制。WinForms 在同一个窗口先载入 Enabled 再导入 Disabled 时没有 else 复位控件，这是暂态窗口状态；本产品每次工作副本应用后重新读取目录，相当于关闭并重新打开来源窗口，不将这次启用残留保存为存档能力。

LinkEntity6 从 PL6 0x09D 起，共六段 0xA0 bytes、步长 0xA8；六道具／数量从 0x489 起、步长 4；BP／里程为 0x4A1／0x4A3。完整实体原始数据只读，不从种类文字框推断独立宝可梦编辑器。源码为只读 PKHeX 26.08.26 的 `PKHeX.WinForms/Subforms/Save Editors/Gen6/SAV_Link6.cs`／`.Designer.cs`、`PKHeX.Core/Saves/Substructures/Gen6/LinkBlock6.cs`、`PKHeX.Core/MysteryGifts/PL6.cs`（内含 LinkEntity6）和两份 SaveBlockAccessor6；三语控件文字来自 `PKHeX.WinForms/Resources/text/lang_zh-Hans.txt`、`lang_en.txt`、`lang_ja.txt`。X／Y／OR／AS 原生完整文件对照通过，前端／客户端／领域／多语言专项 33 项及定向 Lint 通过；完整 verify 的 248 文件／973 项测试与网页／PWA、全套原生、API 116 核心构建、裁剪后 26 类型属性检查和新核心最终网页／PWA 打包均通过。Vitest 退出清理提示已记入进度，不据正常终止前的观察超时重复运行；外部 Chrome 与真实存档核验仍待完成。

### 第六世代秘密基地（API 117，工程检查通过）

已通读只读来源 `PKHeX.WinForms/Subforms/Save Editors/Gen6/SAV_SecretBase.cs`，核对 Designer 显式范围、`PKHeX.Core/Saves/Substructures/Gen6/SecretBase6Block.cs`、`SecretBase/SecretBase6.cs`／`SecretBase6PKM.cs`／`SecretBase6GoodPlacement.cs`／`SecretBase6GoodStock.cs`、RecordBlock6 与 SaveBlockAccessor6AO。仅 SAV6AO，实际块 54、基址 0x23A00、长 0x7AD0；自身一份 0x310-byte 在块内 0x324，其他三十份 0x3E0-byte 从 0x638 起。每基地二十八摆设，其他基地各三格 0x34-byte 对战队伍。导入只接受自身／其他两种精确大小；目标为自身时截取共同 0x310 bytes，其他目标读入自身文件时只替换共同部分，尾部队伍等旧值保持。导出先 SaveCurrent；删除拒绝自身，移动后续其他基地并清末项。

摆设选择 0–27、队伍选择 0–2；Good GUI -1–65535、默认 -1，保存 cast ushort，负一成为 65535；X／Y 为 0–65535、Rotation 0–255。读取通过 Clamp 限制到 GUI 范围，Param1／2 虽存在于结构中，但摆设窗口没有对应控制，不据 Core 字段额外声称窗口可编辑。PG_Base 直接绑定当前 SecretBase6／SecretBase6Other，需要独立核对全部公开可写属性、枚举、派生只读值、文本 setter 与裁剪元数据，不能只接训练家姓名和地点。

队伍来源候选使用目标存档 FilteredSources 的 Ball／Items／Species／Nature／Moves，形态由 FormConverter 与 AO 个人数据产生，特性候选按当前种类／形态的个人数据生成，AbilityNumber 保存 SelectedIndex 左移一位。EC 最大八字符并经 Util.GetHexValue，忽略非 ASCII 十六进制字符、空值为零；IV 为两位数字掩码，保存 Convert.ToByte 后与 31；EV 为三位数字掩码，Convert.ToInt32 后 clamp 0–252；等级与亲密度三位掩码并 Convert.ToByte。四个 PP Ups 下拉在 Designer 均仅有 0／1／2／3，保存 SelectedIndex。空掩码转换、未知旧值与来源完整重保存仍需专门核对。性别／形态／特性联动与固定性别必须匹配来源；IsShiny 和 IsEgg 在 Core 都操作 0x2D bit5，窗口只有异色控制，不得误当成互相独立的存储位。

旗标记录绑定 Records 编号 80，GUI 0–UInt32.MaxValue，来源保存先 cast UInt32 再 cast Int32；RecordBlock6AO 编号 80 最大类型 0，对正值上限 999999999 截顶，负 Int32 不截下限。不能用看似合理的十亿上限替代 GUI 允许值或忽略高位转换，预览必须呈现实际保存值。给予全部摆设调用 GiveAllGoods：前 173 库存写完整 UInt32 值 25 | (1 << 16)，其余 27 库存不变；当前窗口未提供逐库存编辑。三语资源已定位到 lang_zh-Hans／en／ja 的 SAV_SecretBase 键。

新增 SecretBase6Editing／SecretBase6Fields／SecretBase6Pokemon 核心目录、明确补丁、来源重新保存、sb6 文件和完整 SHA-256 冻结预览。自身公开可写属性十五项，其他基地再加 Language／Gender；使用显式类型 setter 与数字转换器接入全部属性，不依赖运行时反射发现字段。属性数字按 Byte／UInt32／Int32 的标准属性转换器处理，地点的 1／2→0 与 -1／85 截顶、IsNew 的两字节重写、文字的十二／十六字符存储和 Rank 的枚举／Int32 输入在预览呈现。属性文字的产品输入上限 32767 是应用保护，不冒充上游 Core 的存储长度。原生夹具通过公共可写属性反射名单核对接入完整度。

队伍目录保留全部三十一控件字段、旧属性值与 0x34 bytes，派生种类／形态／特性候选缓存按存档版本生成；普通明确修改只写指定内容及必要种类／形态／特性／性别联动，不能借此改写旧 PID、Sanity／Checksum 或蛋状态。来源重新保存只规范化当前选中摆设与其他基地的当前队伍格位，同时提交记录 80，不遍历修改所有基地和所有队伍。重新保存还包括两位 IV 掩码截取、EV clamp、未知选择值转 -1 后的位宽转换、能力槽重写及性别显示恢复；无法被来源载入的 PP Ups／种类／形态拒绝该操作，仍可读取和明确修复。文件导出按来源 SaveCurrent 在临时副本中规范化当前格位，输出对应 0x310／0x3E0 bytes，不改当前工作副本、不提交记录 80；文件导入按来源 Load 的共同／完整复制处理。

OR／AS 新专项覆盖全部 31 基地、828 摆设、90 队伍，全部属性类型／转换、旗标边界、173 库存、三十删除位置与两种文件大小，使用独立字节地址或来源属性转换器构造完整文件对照，并检查原件、目标摘要、完整导出及无效请求原子性。首轮在双性别目录调用 FixedGender 时失败，已改为只对固定性别种类调用，修正专项通过。后续复核修正种类／形态变更时未知特性编号的第一槽恢复，扩展专项通过；全部三十一队伍控件的两端／字节地址、雌雄形态联动与负旧记录也已通过扩展专项。源码固定，没有删减覆盖或修改预期避开失败。

API 117 已接 JSExport／独立 Worker／领域和三语浮动面板：全部属性、只读派生状态、二十八摆设与只读参数、三格本地图像队伍、常规／招式／个体努力值、记录、文件与批量均可访问。草稿锁定所属基地／模式／格位，同一目标内允许保留草稿切换属性／字段分组；只读读取／预览／文件导出分支不返回工作副本，只有确认应用返回新存档。预览包括实际属性、摆设、成员、异色／蛋联动、记录的 signed／unsigned 值、移动后的全部基地、库存原始标记和完整字节变化。数字属性支持源类型转换器的十六进制输入；掩码输入按实际字符位宽验证，保存转换交给 Core。前端／客户端／领域／多语言专项 36 项及定向 Lint 通过，完整 verify 的 249 文件／985 项测试与网页／PWA、全套原生、API 117 核心构建、裁剪后 26 类型属性检查和新核心最终网页／PWA 打包均通过；外部 Chrome 和真实存档仍待核验。

### 第六世代超级训练（API 118，工程检查通过）

已通读只读 `PKHeX.WinForms/Subforms/Save Editors/Gen6/SAV_SuperTrain.cs`，核对 Designer、`PKHeX.Core/Saves/Substructures/Gen6/SuperTrainBlock.cs` 与两份 SaveBlockAccessor6。X／Y 和 ORAS 均为块 46，基址 0x1F200／0x20200，长度 0x318。窗口只列前 32 个阶段，每项两组种类／形态／性别／Single 时间，另有十二个训练袋；Core 实际有 48 组，未显示的后十六组、解锁标记、分发标记、Counter 与教程 tracker 不得被普通修改顺带重写或当作窗口现有控制。

两组时间从 0x08／0xC8 起、步长 4；两组 holder 从 0x188／0x248 起、步长 4，依次 UInt16 种类、独立 byte 形态、独立 byte 性别，不是常见宝可梦的 packed 位。种类使用目标存档 FilteredSources.Species。形态／性别虽然用 MaskedTextBox，但 Designer 未设置 Mask 或显式 MaxLength，回调只是 byte.TryParse，实际写入可成功的 0–255，不能按性别 0–2 或当前种类形态数代替源输入。时间读取用 InvariantCulture，回调 float.TryParse 未显式传 Culture，失败／空值保持原有数据；没有正数范围或时间截顶。Main.ApplyMainLanguage 调用 WinFormsUtil.SetCultureLanguage，设置 CurrentCulture 和 CurrentUICulture，因此按当前中文 zh-Hans／英文 en／日文 ja 解析。

训练袋从 0x308 起共十二 byte。窗口把当前语言 trainingbags[0] 改成 `---`，候选只加入非空名称，保存以完整名称数组 IndexOf 查回编号，可能受重复名称影响。B_Save 只把非空袋向前压紧，不清除尾部旧格位；全部选择空袋也没有清空循环，不能实现为清零十二格或稳定过滤后补零。接入克隆名称数组而非修改共享缓存，并在预览显示来源打包后的真实十二格。Core 的 GetOpenBagIndex／AddBag、ClearBlock／ClearRecord／UnlockAllStages 不由此窗口调用，不能据方法存在声称它们是该窗口的现成功能。三语 SAV_SuperTrain 控件键与 Core trainingstage／trainingbags 资源分别来自固定只读源码及 `Resources/text/other/<language>/text_SuperTraining_<language>.txt`／`text_TrainingBag_<language>.txt`。

新增 SuperTrain6Editing、领域／三语图像编辑器，API 118 接 JSExport／独立 Worker／浮动存档面板。纪录补丁只写指定项，Form／Gender／Time 的失败解析在预览 IgnoredFields 显示，旧原始位保持；时间采用当前语言 CultureInfo 与 Single.TryParse，字符串传输及八位原始位避免 JSON 对 NaN／Infinity 的损失。确认沿用冻结的解析语言、完整源／目标 SHA-256，保护其他纪录、所有未显示格位／标记、原件、撤销及完整导出。袋位提交与来源重新保存都使用实际姓名数组 IndexOf／不清尾规则，未知超界编号仍可读取，但必须明确修复后才能执行该来源打包。没有擅自加入解除训练／清块按钮。

时间 TextBox 的默认 MaxLength 32767 可在 [.NET TextBoxBase](https://raw.githubusercontent.com/dotnet/winforms/main/src/System.Windows.Forms/System/Windows/Forms/Controls/TextBox/TextBoxBase.cs) 的字段与 DefaultValue 核对。形态／性别的 [.NET MaskedTextBox](https://raw.githubusercontent.com/dotnet/winforms/main/src/System.Windows.Forms/System/Windows/Forms/Controls/TextBox/MaskedTextBox.cs) 不支持设置 MaxLength，WndProc 在空 Mask 分支前忽略 EM_LIMITTEXT；不能据属性 getter 冒充实测的硬上限。本产品将三个文本输入统一限为 32767 字符作为请求保护，成功 byte 输入与来源完全相同，失败输入不转换为零。以上框架资料为当前公开实现参考，未将其当作固定 PKHeX 源码中的显式设置。

X／Y／OR／AS 核心专项已通过全部 32×2 地址、0／255 byte、三语解析、正负零／NaN payload／Infinity／极限／溢出／下溢、忽略输入、十二袋／全部候选／六种空洞计划、超界修复、共享名称缓存保护、隐藏区域、完整冻结文件对照和拒绝原子性。前端／客户端／领域／多语言专项 34 项与定向 Lint 通过；完整 verify 的 250 文件／995 项测试、格式、静态检查、类型及网页／PWA 打包通过。全套原生、API 118 核心构建、裁剪后 26 类型属性检查与新核心最终网页／PWA 打包均通过，预缓存 252 项；保留既有 Hook、JSExport、反射裁剪和网页体积／插件提示。浏览器连接仍返回 nodeRepl.fetch request failed，没有完成外部 Chrome 或真实存档验收。

### 第六世代训练家窗口（API 119，X／Y／ORAS 工程检查通过）

已通读只读 `Gen6/SAV_Trainer.cs`，核对 Designer 的显式值，以及 MyStatus6、MaisonBlock、SubEventLog6XY、TrainerSprite6；先对照既有训练家姓名／ID／性别／时间／地区／徽章／对应点数／日期／坐标／XY 昵称与外观，避免重复新增。当前完整窗口仍需补五留言、二十 Maison 记录、XY 对战城堡、多人形象、Vivillon、Mega 标记、全窗口重新保存及 Ctrl+姓名的废字节操作。源窗口对 ORAS 移除 Appearance／Battle Chateau 页，AODemo 还移除 Multiplayer／Maison；当前产品该完整接入阶段不据 Demo 继承关系直接开放未核对模块。

五留言控件 MaxLength 16，MyStatus6 从 0x7C 起、步长 0x22 bytes，Core ClearZero setter；二十 Maison 记录从块内 0x1C0 起、步长 2，按五对战模式各四 UInt16 排列。GUI 全部四位数字掩码并绑定 ChangeFFFF，不能拿 Core UInt16 上限代替可输入四位；旧五位值、空输入事件与 ushort.Parse 的保存行为仍需独立对照。XY 城堡等级读取 clamp 到枚举列表、改等级自动设置来源点数 0／5／30／100／300／1000，点数 NUD 0–4095；Core Rank 低四位、Points 高十二位共享 UInt16，各 setter 保护另一项。

多人形象控件在 Designer 禁用后于构造函数对非 Demo 重新启用；候选必须按枚举数组的实际前缀构造，XY 的 max 是 `(int)TrainerSprite6.Trevor` 而非按编号过滤，枚举存在 17／25 空洞，不能假设此值等于最后候选的编号。Mega 两标记为 Status 0x14A bit0／bit1；Rayquaza 勾选只在 ORAS 显示，但源 Save 两种状态都调用 setter。窗口保存无条件 ResetPlayerModel，重写五留言／Maison／Sprite／XY 外观与昵称；坐标仅 GB_Map.Enabled && MapUpdated 时写；姓名仅实际变化才写，分钟／秒取模 60，当前里程同时写记录 63／64，最后保存时间秒归零。既有 TrainerCurrencies 已在修改里程时同时写记录 63／64；TrainerSpatialPosition 已按十八倍缩放与六位小数提供 X／Y 0–65535、Z ±65535、地图 0–1000 与朝向 0–7，不能重复新增。当前 TrainerAppearance6 仅昵称与外观字段，尚无 GiveAllAccessories；Situation.Style 的三位掩码／Change255／byte.Parse 保存也未接入。PlayerSpriteUtil 对 IMultiplayerSprite 使用 tr_{编号:00}，图片缺失回退 tr_00；来源图片位于 PKHeX.Drawing.Misc/Resources/img/Trainer Sprites。FieldMoveModelSave6 每 0x108 bytes 查首个 0x43 标记，模型字段在该记录 +0x8 的 UInt16，无标记时重设无操作；默认模型 XY 男／女 2／1、ORAS 172／171。Fashion6XY.UnlockAllAccessories 复制固定来源字节序列，不能替换成全块填 FF。已新增独立接入路径和合成四版本／两性别夹具，已列出的字段与来源重保存通过完整文件对照；通用基础输入、专属提示和生产验收继续核对，不把这个阶段当作完整窗口完成。

API 119 新增 Trainer6Editing、三语界面与 Worker 路由，嵌入既有训练家入口并互锁两组草稿。五条留言输入最多十六 UTF16 字符，允许空字符串；普通补丁只调用指定 setter，整窗重新保存才重新编码全部留言。二十 Maison 控件四位十进制 0–9999，空输入按 ChangeFFFF 恢复零；用当前公开 .NET MaskedTextBox.Replace 的逐字处理及 MaskedTextProvider 核对，旧 65535 加载为 6553。Style 三位输入经 Change255 截顶 255。数值候选保留真实编号，XY 前 36 个枚举项实际包含 Brendan 37；未知旧值读取显示，普通修改不顺带修正。

XY 完整外观属性另增明确窗口路径，复用既有逐项绑定。普通 UInt32 用 UInt32Converter，枚举用对应 EnumConverter，允许上游类型转换后的值交给 Core 截位；请求预览显示真实写入结果。全字段均显式列出，生产不通过反射发现属性；既有 API 47 的受存储位宽限制的常规入口继续保留。属性文本请求保护上限 32767，不声称这是源 PropertyGrid 的硬输入上限。完整男／女公开属性、极值／十六进制／负枚举／来源名称已与原生来源类型转换及独立 setter 对照，裁剪后运行时元数据与浏览器仍待验证。

姓名废字节提供 prepare／text／hex／clear／layer：26 bytes、52 位十六进制；文本最多十二字符，三十四个源私用字符可追加，名称层使用全部源种类、Gen6 语言和世代 0–100。来源先将当前姓名编码到原字节，文本修改只覆盖写入长度，清除只处理终止符之后，层仅在可见姓名之后覆盖；未知字节与未指定字段保持。整窗保存预览显示实际字段、模型、里程／时间／地区／日期及原始姓名字节。

训练家图片使用未修改 PlayerSpriteUtil 资源 tr_00 等 76 张 PNG，来自同一固定来源 ResX；导入脚本、哈希与本地键映射随源码分发。三语窗口／城堡标签逐字读取固定 WinForms 资源，原版没有 TrainerSprite6 翻译时保留它实际使用的枚举名称。普通字段修改、来源整窗保存、时装及废字节分别冻结源／目标完整哈希；读取和预览不返回工作副本，只有确认应用写入。

位置新增独立来源保存路径：X／Z／Y 从 `(decimal)(float / 18.0)` 加载，完整保留底层 Value 的精度，显示六位小数；地图／朝向显示零位但并非 Value 强制为整数。当前公开 [.NET NumericUpDown](https://raw.githubusercontent.com/dotnet/winforms/main/src/System.Windows.Forms/System/Windows/Forms/Controls/UpDown/NumericUpDown.cs) 的 ParseEditText 使用当前文化 decimal.Parse 后 Constrain，失败保持旧 Value；DecimalPlaces 只控制显示。接入请求使用明确 UI 语言，允许 Source NumberStyles.Number 文本，超界截到 M 0–1000、R 0–7、X／Y 0–65535、Z ±65535；空值／失败显示忽略项。只有实际 decimal Value 改变，才按来源顺序保存 M／X／Z／Y／R 及全部镜像，M／R cast 截去小数。五字段文本统一 32767 字符请求保护，不声称这是 Designer 显式上限。旧浮点 NaN／Infinity／超界导致来源 GB_Map 禁用；读取保持原始位，位置分组禁用，普通其他字段修改继续保护它们。

国家和地区现在携带三语的源列表 ID 顺序，直接使用 Util.GetCountryRegionList 的 CompareOrdinal，不用浏览器区域排序推测。第一空项位置保持，Source SetCountrySubRegion 仅保留旧地区索引大于零且仍有效的情况；国家零保留前一正国家的地区列表，初次零国家则列表为空。保存后的重新读取按新源窗口初始化列表，未知旧编号仍显示并保持，改变国家时按来源实际索引选择新值。

日期再次核对发现：SAV_Trainer 直接将完整日期时间设为 DateTimePicker.Value，而 Designer MaxDate 是 2050-12-31 00:00:00。[.NET DateTimePicker](https://raw.githubusercontent.com/dotnet/winforms/main/src/System.Windows.Forms/System/Windows/Forms/Controls/DateTimePicker/DateTimePicker.cs) 的 Value setter 比较完整时间；因此来源整窗重新载入旧日期后保存，不接受末日午夜之后的值，不能仅用 Year <= 2050 判断。既有底层日期编辑可表示范围继续保留，来源整窗操作独立验证实际载入约束；真实控件行为和产品浏览器验收仍待所有者核验。

剧情记录的旧 TimeHint 已存在，新增三语 TimeHintLocalized 展示，保留旧字符串供兼容与源码对照。沿用 DateUtil 的“天数 + 日内时间”，日期偏移使用日内余数而非完整耗时，整数相加按源 unchecked 行为；未提供可用 bias 时只显示耗时。四版本独立完整文件对照含所有位置字段／三语解析／精度／镜像、三语国家与全部地区顺序、日期载入边界及剧情日期，工程专项已通过；这不是实际游戏存档或浏览器验收。
补充基础输入来源证据：Designer 的 MT_TID／MT_SID 都是五位掩码，TextChanged 明确绑定 ChangeFFFF，空值恢复 0、超过 65535 截为 65535，因此不能只看到 Save 的 ushort cast 就推断发生回绕；MouseHover 绑定 ShowTSV，提示使用 (TID ^ SID) >> 4 并显示四位。姓名 TextBox 最大十二字符，Save 仅在姓名变化时写，没有非空检查。最大金钱按钮把掩码输入设为 9,999,999。已在 Gen6 通用入口增加空姓名、ID 即时规范化、最大金钱和四位 TSV 悬停提示，金钱空值按源 Util.ToUInt32 取零。其他格式的名称与 ID 规则保持；扩展四版本原生完整输出专项、最后类型和定向 Lint 已通过。

当前四版本及两种外观布局工程专项通过，基础 Worker 接线、三语、领域与客户端及外观文本转发专项 36 项、当时类型与定向 Lint 通过。后续基础输入扩展前端专项 38 项通过，更新后的四版本原生／类型及定向 Lint 已通过。当前 API 119 核心构建／裁剪检查仍在原进程运行；尚未完成整轮 verify、原生及最终网页。枚举绑定明确保留 PublicFields 元数据，后续裁剪构建仍待验证。四个完整版本的跨字段地区、日期／脏坐标与专属记录提示已补齐并专项核对；最终全套 verify 的 251 文件／1013 项测试、格式／Lint／类型和网页／PWA、全套原生、API 119 核心构建、裁剪后 26 类型属性检查及最新核心的最终网页／PWA 打包均通过。保留既有 Hook、JSExport、反射裁剪与网页体积／插件提示；外部 Chrome 仍连接失败，真实存档和所有者验收待完成。SAV6AODemo 没有 ISaveBlock6Main／IMultiplayerSprite，源窗口的 Multiplayer（包含留言／Mega）与 Maison 页移除，但 Overview 的 Vivillon 仍显示，试玩版范围尚未开放。它的十六块 Accessor 给出 Situation 0x1000／0x150、Status 0x3C00／0x170、Party 0x3E00、Records 0x5400／0x25C；未初始化 Box 地址，HasBox 为假，不能把 SAV6 基类名义 BoxCount 31 当真实盒数。当前通用箱子报告尚需在试玩版接入时修正，当前未扩展试玩版产品代码。四个完整版本按工程通过记录，最后格式收尾后依已有授权提交推送；试玩版继续保留待接入状态。

## HGSS 宝可全能竞技（API 98）

2026-10-09 通读 `Subforms/Save Editors/Gen4/SAV_Pokeathlon4.cs`／Designer，以及 `Pokeathlon/` 下 Connection、EventData、EventRecord、EventTrainer、Participant、SpeciesForm 六个编辑控件与输入设置。Core 对应 `Saves/Substructures/Gen4/Pokeathlon/`，父块由 SAV4HGSS.GeneralBuffer 的 0xD9D4 起始，长度 0xB80。已写入同一竞技入口及七个用途分组，接通读取和明确补丁的 Worker 路由，工程检查进行中。

| 分组               | 已核对范围与存储                                                                                                                 | 输入依据                                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 常规               | 点数 UInt32；27 个资料卡标记；12 个每日商店标记，偏移 0xB74／0xB78／0xB7C                                                        | 点数 0–99999；标记为逐位布尔。Core 整组 setter 使用 Math.Min 截顶，并非保留高位的掩码；网页需保护未选及保留位。资料卡标记不自动添加背包道具。                                        |
| 奖牌               | 偏移 0xDC，493 种宝可梦各一 byte，低五位依次速度、力量、技巧、耐力、跳跃                                                         | UI 五列布尔及全部获得／全部清空；单种明确补丁应保留其高三位和其他种类。                                                                                                              |
| 赛道               | 五组，每组 0x2C；四个 UInt16 成绩及三位参赛者，每位 12 bytes                                                                     | 四成绩均 0–65535。种类候选使用当前存档 FilteredGameDataSource，HGSS 上限 493；形态使用 FormConverter 的 Gen4 列表。                                                                  |
| 个人／通信项目     | 各十组；个人偏移 0x2CC，每组 0x2C；通信偏移 0x484，每组 0xA4。每项目五个 8-byte 成绩，三份 SpeciesForm10 条目；次数位于内层 0x28 | 成绩 0–65535，次数 0–9999999；数值控件默认下限 0、整数十进制。参赛者 species／form 分别 9／5 bits，成绩条目分别 10／6 bits，产品候选仍须匹配 Gen4 形态。                             |
| 通信训练家         | 每项目五位，各 0x18 bytes；ID32、16-byte 姓名、语言及三个保留字节                                                                | 姓名 Core 最多七个字符；语言候选 0 加 Gen4 的 1／2／3／4／5／7／8。TID／SID 显示五位，底层 UInt16；文本没有显式长度掩码，TryParse 失败或空白取 0。姓名及旧未知语言需单独保持。       |
| 参赛者             | packed 种类、形态、性别和异色；另有 UInt32 EncryptionConstant、TID16／SID16                                                      | 上游标为 PID 的字段最多八个字符，提取十六进制后 TryParse，失败取 0。性别按钮只切换 0／1，2 不可切换；旧 3 的加载显示会截为 2，网页应保留未修改原值。异色为独立标志，不自动推导 PID。 |
| 全局计数／最佳成绩 | 计数块 0xB00，长 0x74；29 个可写 UInt32 及只读 TotalEventFirst；十个最佳 UInt16 位于 0xAEC                                       | TimeSpent 0–59999 分钟，Fame 0–65535，其他计数 0–9999999；TotalEventFirst 由十项首位次数计算，UI 上限 99999990；最佳成绩 0–65535。                                                   |

采用明确字段补丁并在独立块副本上完整验证，成功后才复制到工作存档。单格保留旧超限值、未改姓名字节、队伍高位与其他分组；全部奖牌操作按 Core 写入每种 31 或 0，清除选定整块的旧高位，展示完整替换预览并核对源摘要。资料卡标记不联动添加背包道具。

界面按当前语言提供上游分组／项目／计数标签与 Core 种类／形态／资料卡候选，使用本地宝可梦图像并区分已支持的雌雄图像。PID 和 ID 独立解析、不根据异色标志重新生成；按源规则解析后将要写入的值在应用前展示，ID 默认五位显示，未知性别保持原样。数值控件空白离开时恢复原值，未修改超限值不被重新保存；草稿或预览未处理时限制切换编辑对象。

编辑后刷新目录保留当前分组、赛事、成绩位置和成员位置；在同一赛事的成绩、队伍和训练家之间切换保留关联位置，草稿或预览继续阻止切换。

核心与公开接口四布局专项通过，覆盖所有分组地址、493 种奖牌、29 计数、全部成绩／成员／训练家坐标、完整形态候选、原始姓名、保留位、源摘要和全文件独立对照。前端及错误本地化 8 项专项、类型及定向 Lint 通过；元数据断言中的雌雄图片案例依据 SpriteName 实际支持列表改为沙河马。完整原生、API 98 核心构建及裁剪后 26 类型属性检查通过，最终完整 verify 覆盖 229 文件／866 项测试及网页／PWA 构建。浏览器与真实存档仍待核验。

## 第三世代杂项范围核对（部分接入）

2026-09-30 已通读 SAV_Misc3.cs 并核对 Designer 与部分 Core 数据块。此窗口包含多个独立工作流，不可把现有宝可方块入口记为整个杂项已接入。

- 全部第三世代主系列：Coin（控件 0–9999）、Record3 记录（UInt32 0–4294967295）。记录 1 另有首通时间编辑，小时 0–9999、分／秒 0–59，编码为小时左移 16、分钟左移 8、秒；现有 SaveRecords 保持第六世代及以后模型，第三世代独立接入见本模块专节。
- FRLG：劲敌姓名及原始姓名字节（控件最多 7 字符，字符集及 Core 区域长度仍需核对）；训练家卡片六个种类对应 work 0x43–0x48，使用内部种类转换。
- E／FRLG：宝可梦跳跃、采树果与树果粉。七个游戏输入实际 Mask 均为 0000，树果粉为 00000；不能只按 ReadJoyful 的 99990 显示钳制推断输入上限。两个 score 属性的 Core getter 读 UInt16，而 setter 写 UInt32；WinForms 保存另转换为 ushort。实现前必须记录这些不对称和精确回读范围，保留未改高位，禁止静默截断。
- E：BP 控件 0–9999、累计 BP 0–65535。对战开拓区包含七设施、各自有效模式、两种等级记录、有效统计项、继续标记、通行证和七组银／金标记。统计输入 0–9999，设施／模式／统计组合必须以 BattleFrontier3 的方法校验；未修改异常旧值需保留。
- E 船运：十个标记索引为 0x864、0x8B3、0x8D5、0x8D6、0x8E0、0x1D0、0x1AE、0x1AF、0x1B0、0x1DB。船票批量添加使用 0x109、0x113、0x172、0x173、0x178，跳过已有物品；非日文版的古航海图需明确选择。上游从首个空槽连续写入，并以 end + missing.Length >= 容量拒绝；网页预览应核对空间和覆盖风险后再应用，不能套用无条件填满背包。
- RS／E：宝可方块与装饰品已接入；装饰品覆盖八类固定槽位、同类过滤、空值与末尾压缩，分类和容量依据见本模块专节。
- RS／E：五幅绘画，索引 0–4、相对说明 0–2、启用标记、种类、TID／SID、PID、昵称与训练家姓名。禁用后上游清空该幅绘画。ValidatePaintingIDs 将 PID 改写为十进制字符串，与十六进制解析不一致；网页应保持 UInt32 个性值的十六进制表达，避免把这段展示问题带入写入流程。绘画接入、姓名长度／编码、原始区域和说明偏移核对见本模块专节。
- RS／E 幻影岛按钮把队伍首槽 PID 的低 16 位写入 work 0x24；上游不检查队伍人数。网页需明确目标来源与操作结果，不改动其他 work。

补充 Core 核对：Record3 记录基址为 LargeBlock 的 RS 0x1540、E 0x159C、FRLG 0x1200，读写应继续使用 SAV3.GetRecord／SetRecord 处理安全密钥。装饰品区域 RS 0x26A0、E 0x2734，共 150 字节；八类容量依次为 10、10、10、30、30、10、40、10。

绘画区域 RS 0x2EFC、E 0x2F90，每幅实际 0x20 字节。当前 GetPaintingSpan 却从所选幅偏移起返回 5 幅长度，直接调用返回对象的 Clear 会连带清除后续绘画及寄放屋区域；接入时必须先限制为单幅 0x20 字节，再调用 Paintings3.Clear／SetPainting，并以完整文件对照保护相邻数据。绘画启用标记为 160–164；PID、TID、SID、内部种类和说明偏移依次为 0、4、6、8、0x0A；昵称位于 0x0B 长 10，训练家姓名位于 0x16 长 7，使用 StringConverterOption.None。未修改姓名及间隙字节应保留，编码回读不一致须拒绝。E 的 BattleFrontier 区域位于 SmallBlock 0xCDC、长 0x1DC，BP／累计 BP 位于 0xEB8／0xEBA。

下一步先补齐各 Core 偏移、范围和资源依据，再按共用表单规则分组接入；本节仅为源范围与已发现差异记录，不能作为功能完成或验收证据。

## 水晶版 GS 球事件

已核对 WinForms/Subforms/Save Editors/Gen2/SAV_Misc2.cs 与 Core Saves/SAV2.cs 的 IsEnabledGSBallMobileEvent／EnableGSBallMobileEvent。
上游杂项窗口只在水晶版显示开启按钮，没有数值输入；不检查是否为 Virtual Console 来源，允许原 GB 与 VC 存档使用同一操作。金银及其他格式不适用。

| 区域   | 主状态绝对偏移 | 备份状态绝对偏移 | 开启值 |
| ------ | -------------- | ---------------- | ------ |
| 国际版 | 0x3E3C         | 0x3E44           | 0x0B   |
| 日文版 | 0xA000         | 0xA083           | 0x0B   |

已开启只根据主状态等于 0x0B 判断，与上游按钮启用条件一致；主状态已开启而备份异常时不额外提供修复操作。其他旧值均按未开启读取，开启同时写入两处，不清除其他剧情标记。
日文版缺少后半段数据时返回不可用，不调用越界属性，不填充文件后写入。国际版保留 0x8000／0x10000 文件长度；输出复核游戏、区域布局、精确长度、校验及两处状态。
GsBall2.cs 已提供状态读取与开启核心，写入仅接受校验有效、可导出且尚未开启的水晶存档。专项验证覆盖主／备不同旧值组合、区域偏移、相邻字节、完整文件对照、缺失区域、损坏校验、原件保持和精确工作副本导出。
API 86、Worker 与三语入口已接入。入口仅在报告为 SAV2／C 时显示，状态区分未开启、已开启、只读和缺少区域；成功开启后刷新目录并禁用按钮。沿用工作副本、撤销和精确导出，不创建新的持久化存档。
公开接口与前端验证状态见进度，浏览器及真实存档待核验。

## 第一世代殿堂记录

2026-09-30 已核对 SAV_HallOfFame1.cs、其 Designer、Core HallOfFameEntity1.cs、SAV1.cs、SAV1Offsets.cs 与 StringConverter1.cs。API 85 已接入殿堂记录入口。

- 全部记录位于原始存档 0x0598 起的 0x12C0 字节，共 50 队、每队 6 格、每格 16 字节；使用 SaveFile.Buffer，不是解包后的队伍／箱子 Reserved 缓冲区。
- 格内第 0 字节为第一世代内部种类编号，第 1 字节为等级；全国编号通过 SpeciesConverter 转换。有效种类 1–151，选择无种类调用 Clear，而不是只改为零。
- 等级与计数控件均为十进制整数 0–255，最低值来自 NumericUpDown 默认 0；不能套用普通宝可梦等级 1–100。格位控件 1–6，API 可使用零基编号 0–5，队伍编号 0–49。
- 国际版昵称最多 10 字符，原始区域为格内偏移 2 起的 11 字节；日文版最多 5 字符、原始区域 6 字节。未修改昵称不得重编码；其余格内尾部字节需保留。Core SetString 会截断过长或不可编码文本，网页写入前须检查编码回读，避免静默截断。
- 取消自定义昵称按存档语言恢复第一世代种类名，不能按界面语言写入。界面物种名称、操作与消息仍提供中／英／日三语；上游昵称控件另有原始字节编辑入口，不能漏项。
- 空格的内部编号为 PokeList1.SlotEmpty；Clear 清空整格，再将昵称区填 0x50。队伍人数取第一个空格前的数量，空格之后的字节仍存在，读取和编辑不得自行压缩成员。
- 单格清除按钮仅对第 2–6 格启用；整队删除仅对第 2–50 队启用。Core Delete 将后续队伍前移并清空最后一队，不自动递减通关计数。选择无种类清空成员是独立操作，不应与按钮限制混淆。
- 添加当前队伍复用 RegisterParty：计数小于 50 时写入对应下标并加一；计数达到 50（包括 255）时移除最早一队，写入第 50 队，返回计数 50。逐格使用原队伍昵称字节；空成员通过 Clear 初始化。
- 清空全部同时清空 300 格并将计数归零。计数位于国际版 0x284E、日文版 0x2844；与实际非空队伍数量独立。上游窗口没有单独的殿堂文件导入／导出按钮，网页通过完整工作副本下载保留结果。

实现需覆盖 RB／Yellow 的国际版与日文版，读写权限独立于尚未开放的训练家编辑。三语入口提供队伍列表、六格图像与摘要、成员编辑、昵称原始字节、计数、登记当前队伍、删除与清空；所有写入走完整请求校验、工作副本和撤销。
验证须包括全部 300 格、计数 0／49／50／255、两种昵称长度、无效字符、原始尾部字节、空洞、非标准旧值、删除位移、登记队伍、原件保持与整文件导出回读；浏览器检查不以 Core 专项替代。

HallOfFame1.cs 已实现完整目录、成员补丁、昵称原始字节／恢复种类名、计数、清除成员、删除队伍、登记当前队伍和清空全部。成员编辑先在独立 16 字节缓冲区验证，再一次写回；导出重新识别并复核区域布局、游戏、长度、校验、计数及完整殿堂区域。
原生专项已通过国际版／日文版 RB、Yellow 四种布局：每个格位等级写入、完整文件对照、计数及登记边界、昵称与原始字节、空洞保持、删除／清空、无效请求原子性、原件与工作副本导出。仅保留既有 JSExport 提示。
API、Worker 与三语殿堂入口已接通，队伍选择显示有效人数，六格预览使用本地图像；成员编辑保留未改字段，原始字节模式要求精确 12／22 位十六进制。昵称编码回读不一致时拒绝，不静默截断。
计数与成员草稿互斥，有草稿时禁止切换队伍／成员及执行批量操作，提供应用与放弃；所有已应用操作进入既有撤销、原件保留和完整工作副本下载流程。只读存档仍可浏览队伍，训练家编辑保持关闭。
API 与前端检查状态见进度；浏览器及真实存档待核验，不将核心专项记为产品验收。

## 第一世代定点与赠送事件重置

API 84 接入 SAV_EventReset1，覆盖国际版与日文版 RB／Yellow 四种布局。三语目录使用 Core 的 G1OverworldSpawner，RB 共 18 项，Yellow 共 21 项；Yellow 增加三只初始伙伴。名称沿用当前语言的种类名与重复项目编号，不包含上游未列出的卡比兽。

上游没有数值输入，每项按钮仅在关联剧情或隐藏标记为真时可用。网页提供搜索、多选及一次应用；任一关联标记为真即可重置，操作清除该项目关联的两个非零标记，零为无关联哨兵。不会添加宝可梦，游戏中的其他触发条件仍需满足。
请求必须选择 1 至实际目录数量个不同的稳定标识，拒绝未知、重复、大小写不符、空项及已清除项目；全部验证后再修改工作副本。原件保留，支持既有撤销与导出，训练家编辑权限保持独立。

| 数据     | 数量    | 国际版绝对偏移 | 日文版绝对偏移 |
| -------- | ------- | -------------- | -------------- |
| 剧情标记 | 2560 位 | 0x29F3         | 0x29E9         |
| 隐藏标记 | 240 位  | 0x2852         | 0x2848         |

沿用 Core 的最终映射，包括 Yellow 化石项目的覆盖赋值；未选标记、零号哨兵和未使用尾部位保持。写出后重新识别游戏组、区域布局、校验及两组完整数组。G1OverworldSpawner 通过反射发现私有属性，裁剪配置显式保留该类型，并纳入属性完整性检查。

上游依据：WinForms/Subforms/Save Editors/Gen1/SAV_EventReset1.cs；Core Saves/Substructures/Gen12/G1OverworldSpawner.cs、Saves/SAV1.cs 与 SAV1Offsets.cs。四种布局的全部项目、四种双标记组合、三语名称、原始位与完整文件对照、无效请求原子性、校验损坏及导出专项通过；完整检查状态见进度，浏览器及真实存档待核验。

## BDSP 事件标记、系统标记与数值

API 83 接入 SAV_FlagWork8b，覆盖晶灿钻石／明亮珍珠的四种存档修订版。事件工作区增加独立“系统标记”模式，与普通标记、数值分别保留选择位置和草稿；具名分类、预设、搜索、按编号定位、差异预览、应用／撤销沿用已有流程。

| 数据     | 数量／编号   | 新值范围               | 绝对偏移 |
| -------- | ------------ | ---------------------- | -------- |
| 事件数值 | 500／0–499   | −2147483648–2147483647 | 0x00004  |
| 普通标记 | 4000／0–3999 | 关闭／开启             | 0x007D4  |
| 系统标记 | 1000／0–999  | 关闭／开启             | 0x04654  |

三类数据每项均为 4 字节；整个 FlagWork8b 数据块从 4 开始，长度 0x55F0。数值使用小端 Int32；标记仅在原值等于 1 时为真，写入使用 0／1。
网页保留未改标记的非标准旧值，例如原值 2 显示关闭，不因读取、未改草稿或其他项目编辑而归零。只有实际开关变化才调用 SetFlag／SetSystemFlag。
数值输入对应上游 NumericUpDown 的 Int32 最小／最大值及默认零小数位；网页允许负号和最多 10 位十进制数字，拒绝空值、小数、指数、十六进制与越界值。
三个数组分开校验数量、重复编号、缺失字段及范围；全部验证完成后再写入，不因后续系统标记无效而留下普通标记或数值的部分修改。没有系统标记的旧格式拒绝非空系统补丁。

具名目录复用 EventLabelParsing 与 bdsp 的 flag／system／work 三语资源，不修改 GameInfo.CurrentLanguage；解析上界传实际数量，允许最后一个合法编号。
预设保留 Core 的 NamedEventConst 语义，自定义哨兵不作为固定选项，手动数值仍支持完整 Int32。除 BDSP 外，已有格式的范围和 Let’s Go 分组保持。
双文件比较使用 EventWorkDiff8b 的类型化结果，分别显示新增／清除普通标记、系统标记及数值前后值；系统单独变化时也能完整显示，不依赖上游文本汇总。
同游戏不同修订版沿用 Core 的比较能力，BD 与 SP 不混比；每个文件最大 1 MiB。保存复核游戏、修订版、精确文件长度、校验及三组完整数组，原件、工作副本、撤销和下载复用既有流程。
四种修订版为 V1_0／V1_1／V1_2／V1_3，头部值分别 0x25／0x2C／0x32／0x34，文件长度分别 0xE9828／0xEDC20／0xEED8C／0xEF0A4。

上游依据：WinForms/Subforms/Save Editors/Gen8/SAV_FlagWork8b.cs 与 .Designer.cs 的三类控件、原始编号和比较；Core Saves/Substructures/Gen8/BS/FlagWork8b.cs、Gem8Version.cs、SAV8BS.cs、SaveUtil.cs、Editing/Saves/Editors/EventOld/EventLabelCollectionSystem.cs／EventLabelParsing.cs、EventWork/Diff/EventWorkDiff8b.cs。
两版本四修订版的全部编号、三语资源、Int32 边界、异常布尔原值、原始字节与完整文件对照、请求原子性、独立系统比较和导出专项通过，第二至第七世代及 Let’s Go 事件专项通过；22 项前端检查与定向 Lint 通过。完整检查状态见进度，浏览器及真实存档待核验。

## Let’s Go 事件标记与数值

API 82 接入 SAV_EventWork，覆盖皮卡丘／伊布两版本。沿用事件工作区的具名项目、预设、搜索、按原始编号定位、草稿、应用／撤销与双文件比较。
全部 4096 个标记与 1000 个 Int32 数值可读写，原始编号分别为 0–4095、0–999；数值范围为 −2147483648–2147483647。
上游 NumericUpDown 的 DecimalPlaces 为默认 0，Minimum／Maximum 使用 Int32 两端；网页使用十进制整数文本，最多 10 位数字及负号，允许前导零，拒绝空值、小数、指数、十六进制与越界值。
第二至第七世代已有事件保留各自 byte／UInt16 范围与五位输入；协议新增 minimumValue、分组范围，数值 DTO 统一为 Int32，不对旧格式放宽写入。

| 数据 | 分组                           | 原始起点             | 数量                  |
| ---- | ------------------------------ | -------------------- | --------------------- |
| 标记 | 区域／系统／隐藏对象／事件     | 0／128／640／2176    | 128／512／1536／1920  |
| 数值 | 区域／系统／场景／事件／未分类 | 0／32／160／672／928 | 32／128／512／256／72 |

具名资源通过 SplitEventEditor<int> 与 gg 三语资源读取，保留 Core 的原始编号和选项值；自定义哨兵不作为预设，但 Int32 最小值仍可手动填写。
分组筛选覆盖无名称项目，关闭“仅显示具名项目”可浏览所有槽位，当前项目显示组内编号；最后 72 项可直接读取、编辑和比较，不因 Core 未定义其组名而隐藏。
写入使用 EventWork7b.GetFlag／SetFlag、GetWork／SetWork；整个请求先验证，再应用修改。资源组内编号使用严格小于数量的校验，不沿用 Core 相对编号允许等于数量的越界边界。
事件块在 0x1200，数值为其前 4000 字节的小端 Int32，标记从绝对 0x21A0 开始占 512 字节；剩余块数据保持。大师训练家称号位位于块内 0x1298，由 SAV_Trainer7GG 负责，仍在该窗口清单内，不通过事件编辑附带解锁。
比较使用 EventWorkDiff7b 的类型化编号结果及原始前后值，不使用其文本汇总的分组推断；两文件必须为同一版本，每个不超过 1 MiB。
保存后复核游戏版本、校验、全部事件数组，再进入工作副本；原件保持、撤销与精确副本下载复用现有流程。独立事件权限不开放未完成的训练家编辑。

上游依据：WinForms/Subforms/Save Editors/SAV_EventWork.cs 与 .Designer.cs；Core 的 Saves/Substructures/Gen7/LGPE/EventWork7b.cs、SaveBlockAccessor7b.cs、Editing/Saves/Editors/EventWork/SplitEventEditor.cs、EventWork.cs、Diff/EventWorkDiff7b.cs，以及 Resources 中 gg flags／const 三语资源。
两版本全部编号、分组边界、正负 Int32 两端、原始字节与完整文件对照、未分类槽位、称号保留、原子拒绝、比较与导出专项通过，原有第二至第七世代事件专项通过。21 项前端检查及定向 Lint 通过；完整检查状态见进度，浏览器和真实存档待核验。

## 第二世代事件标记与数值

API 81 接入 SAV_EventFlags2，覆盖国际版／日文版金银与水晶、韩文版金银五种布局。
SAV2 固定包含 2000 个布尔标记和 256 个 byte 事件数值，编号分别为 0–1999、0–255；新增值限 0–255。
沿用上游 MaskedTextBox 的五位十进制输入宽度，允许前导零；空值、负数、小数、指数及超过 255 的值拒绝，不按桌面解析失败时归零。
目录新增独立 canEdit 与 maximumValue，第三至第七世代保持 65535 上限；第二世代界面、预设与提交校验使用 byte 上限，写入时不截断或溢出转换。
具名分类、预设、搜索、按编号定位、草稿预览、应用／撤销和三语资源沿用事件工作区；只读情况下仍可浏览，不开放其他未接入的 GB 编辑器。

| 布局       | 事件标记偏移 | 事件数值偏移 |
| ---------- | ------------ | ------------ |
| 国际版金银 | 0x261F       | 0x251F       |
| 国际版水晶 | 0x2600       | 0x2500       |
| 日文版金银 | 0x2600       | 0x2500       |
| 日文版水晶 | 0x25E2       | 0x24E2       |
| 韩文版金银 | 0x25F7       | 0x24F7       |

标记占 250 字节，数值占其前方 256 字节；生产读写调用 Core GetEventFlag／SetEventFlag 与 GetWork／SetWork，表中偏移用于独立原始字节测试。
比较调用 EventBlockDiff<SAV2, byte>，保留新增／清除标记与数值前后值；金银文件由 Core 识别为 GS 组，不虚构单独金／银识别结果。
导出复用 Core 的区域备份与保存流程，韩文版复用项目已核对的 SaveChecksums 双区域校验；重读核对游戏组、区域布局、完整事件数据及校验和，下载保持工作副本的精确字节。
五布局八组样本长度（国际／韩文 32／64 KiB、日文 64 KiB）的三语目录、全部编号与 byte 值、独立位／字节及完整输出、主备份校验损坏、请求原子性、比较与导出专项通过；真实存档和浏览器仍待核验。
上游依据：WinForms Subforms/Save Editors/SAV_EventFlags2.cs／Designer.cs 的 AddConstList、ChangeCustomConst、DiffSaves 与 MT_Stat.Mask；Core Saves/SAV2.cs 的 EventFlagCount、EventWorkCount、GetWork、SetWork、GetFinalData，Saves/Substructures/Gen12/SAV2Offsets.cs 的五组布局。

## 第三至第七世代事件标记与数值

API 80 接入 SAV_EventFlags 对应的 12 种布局：RS／E／FRLG、DP／Pt／HGSS、BW／B2W2、XY／ORAS、SM／USUM。
读取通过 IEventFlag37 或 IEventFlagProvider37.EventWork，包含全部布尔标记和 UInt16 事件数值；不以具名项目数量代替实际数组长度。
具名目录、分类编号及预设值使用 Core EventLabelParsing 与 flags／const 三语资源，缺少资源时沿用 GameLanguage 的英文回退；不改动全局语言状态。
界面提供标记／数值模式、分类、名称或编号搜索、具名筛选、按编号定位、预设与手工数值；切换项目保留草稿，可查看待应用差异后统一应用或放弃。
只读存档仍可切换模式、筛选与定位，仅禁用修改控件。比较文本沿用现有表单样式和 44px 操作基线。
标记编号为十进制 0–EventFlagCount−1，数值编号为 0–EventWorkCount−1；编号框最多 5 位。
事件数值为十进制 0–65535、最多 5 位，拒绝空值、负数、小数、指数及越界；不沿用桌面 MaskedTextBox 解析失败时归零的副作用。
预设目录不把 NamedEventConst.CustomMagicValue（65535）当作预设值，手工输入仍允许 65535；切换到自定义不自动归零。
编辑提交变化项，两个数组均必须存在，单项必须有编号和值；拒绝重复、越界、缺字段及超过实际数组长度的请求，先验证整个请求再写入。JSON 上限 1 MiB。
SM／USUM 有实际变化时沿用 EventWorkspace.Save 的 UpdateQrConstants 联动；SM 标记 3100、USUM 标记 4060／4562 决定 QR 块常量。
联动严格使用 Core 现有写入规则，包括 USUM 的 0x168／0x16C 写入位置；只读、空修改及值未改变的请求不触发同步，保留异常原字节。
写出后核对类型、校验和、全部标记／数值及联动 QR 字节；原件、工作副本、撤销与导出仍使用同一会话流程。

研究比较接受两个同游戏版本的非空存档，各最大 1 MiB；核对类型、版本与数组布局后调用 EventBlockDiff，输出新增标记、清除标记及每个数值的前后值，可查看和下载文本。
比较在存档 Worker 内运行，不替换当前工作副本，也不应用编辑草稿；对第二个文件的 Base64 与请求长度同时设限。
第二世代对应窗口见上节；Let’s Go 的 SAV_EventWork 见本文首节，后续世代不同结构的事件窗口仍待接入。
12 布局专项已覆盖三语资源、每个编号、位边界／UInt16 边界、全文件 Core 对照、请求原子性、未改 QR 保持、QR 组合及差异方向；真实存档与浏览器检查仍待完成。

上游依据：WinForms Subforms/Save Editors/SAV_EventFlags.cs／Designer.cs 的 AddFlagList、AddConstList、ChangeCustomBool、ChangeCustomConst 与 DiffSaves；Core Editing/Saves/Editors/EventOld 下的 EventWorkspace、EventLabelParsing、NamedEventWork，EventWork/Diff/EventWorkDiff.cs，Saves/Substructures/IEventFlagArray.cs，SAV7SM／SAV7USUM.UpdateQrConstants。

## 仓储工具布局与浏览器检查

仓储工具收拢为可换行的紧凑网格，展开项占完整一行；标题保持 44px 操作高度，并提供展开箭头与键盘焦点。
箱子导入、整箱数据、整理宝可梦与宝可梦编辑使用独立组件标识，避免切换队伍／箱子后留下重复工具。
2026-09-30 外部 Chrome 已重新连接并确认加载当前构建。X 合成存档的盒子壁纸、皮卡丘图像与 30 格布局正常加载；游走遭遇次数从 0 改为 11 后可撤销回 0。
这些记录是本地合成样本的工程证据；其他格式、真实存档与项目所有者验收仍待完成。

## X／Y 游走宝可梦

API 79 增加 X／Y 的游走宝可梦读取与编辑，覆盖 SAV_Roamer6 的种类、遭遇次数和状态。
种类可新设为 144／145／146，名称对应 Core 三语 Species 资源；状态为未激活、游走中、固定地点、已击败、已捕获（0–4）。
上游 NumericUpDown 最小值为 0、最大值为 11；网页遭遇次数接受最多 10 位十进制整数，以展示原有 UInt32 异常值，新增值必须在 0–11，拒绝空值、负数、小数及指数形式。
三个字段完整提交，缺失字段拒绝；未修改的未知种类、状态和异常次数可原位保持，修改其他字段不归一化旧值。
种类为 0 时原样显示“尚未设置”，读取不采用桌面控件初始化时自动写入推导种类的副作用。
EventWork[48] 为 0–2 时提供显式“按初始伙伴选择种类”按钮，选择对应 144–146 的草稿；其他值不提供推导，且不改动初始伙伴或剧情标记。
Encount6 的 0x1C 起为 40 字节 Roamer6：种类占小端 UInt16 的低 10 位；状态占第 7 字节的高 4 位；次数占第 36–39 字节。
通过 Core 属性只写变化字段，保留种类高 6 位、状态低 4 位、等级及其他保留字节；导出重读检查格式、校验和及完整 40 字节块。
仅 SAV6XY 开放，拒绝 ORAS 与其他格式；复用 Worker、工作副本、撤销、原件下载和回读验证。三语界面沿用共享选择器及浮动工具密度。
原生专项覆盖 X／Y 各 180 个合法组合、独立字节偏移与完整文件对照、空种类、未知旧值、推导边界和原件保持；X 合成样本已在外部 Chrome 完成次数修改与撤销，Y 浏览器交互及真实存档仍待核验。
上游依据：WinForms Subforms/Save Editors/Gen6/SAV_Roamer6.cs／Designer.cs 的 GetInitialIndex、三个控件事件与 NUD_TimesEncountered.Maximum；Core Saves/Substructures/Gen6/Encount6.cs 和 EventWork6.cs。

## 第三世代存档时钟

API 78 增加红／蓝宝石与绿宝石的存档时钟入口，覆盖初始时钟、已过去时间、两组归零及树果修复日期推进。
SAV3RS／SAV3E 的 SmallBlock 在 0x098、0x0A0 各保存一个 8 字节 RTC3；其第 0–1 字节为小端 UInt16 天数，第 2／3／4 字节为时／分／秒，第 5–7 字节保留。
WinForms NumericUpDown 的最小值为 0，天数上限 65535，小时上限 23，分／秒上限 59；网页分别接受最多 5／3 位十进制整数，拒绝空值、负数、小数及新增越界值。
读取保留原始 byte 时间值；超出常规范围的现值可原位保持，主动变更必须进入常规范围，避免桌面 LoadData 的显示截断影响无关修改。
普通编辑完整提交两组各四个字段，先验证两组再写入；通过 ClockInitial／ClockElapsed 的副本与属性回写更新，保留六个保留字节。
归零只将八个具名字段设为 0；树果修复沿用 B_BerryFix_Click，把已过去天数设为 Max(734, 当前天数)，其余字段保持。两者拒绝夹带草稿数据。
仅 SAV3RS／SAV3E 开放，火红／叶绿及其他格式不提供该入口。读写运行于独立存档 Worker，复用工作副本、撤销、原件下载与校验和回读，写出后核对两组完整 8 字节。
界面按两组时钟显示双列字段，异常原值带说明，批量操作在草稿未应用时禁用；保留三语与浮动工具 44px 控件基线。
上游依据：WinForms Subforms/Save Editors/Gen3/SAV_RTC3.cs／Designer.cs 的 LoadData、SaveData、B_Reset_Click、B_BerryFix_Click；Core Saves/Substructures/Gen3/RTC3.cs、Saves/Blocks/Gen3/SaveBlock3SmallRS.cs、SaveBlock3SmallE.cs 与 ISaveBlock3SmallHoenn.cs。

## 第六世代 O 力量

API 77 在存档工具中增加 XY／ORAS 的 O 力量入口，读取与编辑复用本地 Worker、工作副本、撤销及导出。
完整目录包括 OPower6Index 的 65 个状态、OPower6FieldType 的 10 项两组数值、OPower6BattleType 的 7 项两组数值，以及点数。
82 个枚举名称摘自 PKHeX.WinForms Resources/text/lang_zh-Hans.txt、lang_en.txt、lang_ja.txt，保持上游原文与枚举索引；来源说明保留在 opowerNames.ts。
Core OPower6 块固定 100 字节：状态 0–64、点数 65、场地数值 66–75／76–85、战斗数值 86–92／93–99。
35 个可编辑数值均为 byte，WinForms NumericUpDown 范围为 0–255；网页接受 1–3 位十进制整数，拒绝空值、负数、小数和越界。
状态按 GetState == Unlocked（1）显示；只在用户改变解锁状态时调用 SetState 写入 0／1，未修改的其他原始值保留并显示编号，不因修改点数而统一清零。
全部解锁直接调用 UnlockAll：65 个状态设为 1、34 个数值设为 3，保留点数；清空直接调用 ClearAll：保留第 0 字节的总开关，清零第 1–99 字节。
编辑请求必须完整包含 65 个布尔状态、10／10／7／7 项数值及点数；批量动作拒绝夹带草稿字段。拒绝不适用存档、超长请求与无效校验和编辑。
写出后重新识别格式、检查校验和，并比较完整 100 字节块；原始输入缓冲区始终保留。
状态、场地及战斗项目使用选择器，所有项目草稿同时保留；批量操作在草稿未应用时禁用。控件沿用浮动工具 44px 基线，三语文字与原始编号提示保持可读。
上游依据：WinForms Subforms/Save Editors/Gen6/SAV_OPower.cs／Designer.cs 的 LoadCurrent、SaveCurrent 与批量按钮；Core Saves/Substructures/Gen6/OPower/OPower6.cs、OPower6Type.cs、OPower6FieldType.cs、OPower6BattleType.cs、OPowerFlagState.cs。

## 心金／魂银球果盒

API 76 在背包分类中增加球果盒，不把独立存储的球果伪装成普通背包格位。
七类球果固定使用红、黄、蓝、绿、粉、白、黑的存档顺序；物品编号依次为 485、487、486、488、489、490、491。
三语名称来自 Core GameStrings.Item，本地图像复用对应 bitem 资源。
每项为 General[0xE558 + index] 的一个 byte，输入为 1–3 位十进制整数，范围 0–255；拒绝空值、负数、小数和越界，不按桌面文本框失败时归零或负数转换为 byte 的行为静默修正。
全部设为 99／清空沿用 SAV_Apricorn 的批量默认值；不将补满值误认为逐项上限。
读取通过 GetApricornCount，写入通过 SetApricornCount；请求使用独立动作和七项数组，普通背包操作拒绝混入球果数据。
仅 SAV4HGSS 提供目录与操作，拒绝不适用游戏、错误数量／数组长度及普通背包标记混用。导出沿用原件保持、工作副本、撤销及完整背包／球果回读验证。
表单沿用双列字段、44px 控件和本地物品图像；有草稿时禁止切换分类或批量覆盖。
上游依据：WinForms Subforms/Save Editors/Gen4/SAV_Apricorn.cs／Designer.cs 的 ItemNameOffset、Setup、B_All_Click、B_None_Click、B_Save_Click，及 Core Saves/SAV4HGSS.cs 的 GetApricornCount／SetApricornCount。
本项覆盖球果盒窗口；球果汁与宝可全能竞技赛记录仍按各自窗口单独接入。

## 宝芙蕾与宝可豆

API 73 接入 XY／ORAS 的宝芙蕾、SM／USUM 的宝可豆，入口为存档工具中的“宝可梦食物”。
宝芙蕾有 100 个格位，每格编号 0–26；名称直接使用 Core GameStrings.puffs 的中英日文资源。
PuffCount 为独立 Int32 字段，新增编辑范围 0–100，不根据非零格位重算；未修改的异常数量和格位编号保留。
批量操作直接调用 Puff6.Sort(false/true)、MaxCheat(false/true)、Reset：普通补满以 1–26 循环后打乱，顶级补满为随机 21／22，数量均为 100。
恢复默认设置首五格为 1–5、剩余清零、数量为 5；排序只改变格位次序，不改变数量。
与桌面 SAV_Pokepuff 保存时统一设置数量 100 的行为区分：网页独立编辑该字段，避免只改一格就增加实际持有量。
宝可豆依据 ResortSave7.GetBeans 的 15 项顺序（七种普通、七种花纹、彩虹），每项为 0–255；补满／清空使用 FillBeans／ClearBeans。
拒绝负数、越界、空值、错误数组长度及不适用的操作；逐格编辑时，原始未列出宝芙蕾只可原位保持，不可复制为新增值；批量排序沿用 Core 的全格位排序。
批量按钮在有未应用草稿时禁用。修改沿用存档原件、工作副本、20 步／64 MiB 撤销和导出，不覆盖原文件。
写出后检查格式、校验和及完整食物所在块；后端仅支持 SAV6XY、SAV6AO、SAV7SM、SAV7USUM。
界面沿用 Ant Neutral 浮动面板、44px 控件与双列响应式字段，宝芙蕾通过格位选择器避免同时展开 100 行；不新增主题或装饰面板。
上游依据：WinForms Subforms/Save Editors/Gen6/SAV_Pokepuff.cs、Gen7/SAV_Pokebean.cs，
Core Saves/Substructures/Gen6/Puff6.cs（前 100 字节与后续数量）、Gen7/ResortSave7.cs（0x564C 起 15 字节）及 BeanColor7。
宝可豆标签按上游枚举顺序提供三语描述。其他世代树果和宝可度假地其他记录仍为独立待接入项。

API 74 接入 ORAS 宝可方块及该上游窗口的树果田重置操作，在同一食物入口内分区切换；有未应用草稿时禁止切换，应用／撤销后保持所选分区。
12 类宝可方块使用 Contest6.CountBlock 与 GameStrings.pokeblocks[94..106] 的原生顺序、三语名称。
存储为 Contest 块前 0x30 字节的 12 个 UInt32，桌面 NumericUpDown 与 Core MaxBlock 均为 0–999；输入为空、小数、负数或新增越界值时拒绝。
原始超出 999 的值可精确读取并原位保持不变，跳过 SetBlockCount，防止 Core 的上限截断影响无关编辑；其他更改必须在 0–999 内。
全部补满／清空对应 12 项 999／0。API 拒绝不适用游戏、字段混用、缺失或错误长度数组，写出回读同时核对 Puff、Contest 与 BerryField 三个完整块。
树果田调用 BerryField6AO.ResetAndRandomize(Util.Rand, ItemStorage6XY.Berry)，只处理 90 个有效格位，每格 16 字节，保留后续 10 个未使用格位及块尾数据。
每格沿用 SetAsDefault：清零整格、GrowthStage=5、Count=4（Single）、IsDefault=true，Time／Water 为 0，再随机指定上游树果目录中的种类。
界面展示有树果的格位数（排除 0／0xFFFF），使用展开说明与明确确认按钮提示重置范围；确认后修改工作副本，可撤销。
依据 Core Saves/Substructures/Gen6/Contest6.cs、BerryField6AO.cs，以及 WinForms Subforms/Save Editors/Gen6/SAV_PokeBlockORAS.cs／Designer.cs。
本批不扩展为任意树果生长字段编辑器；清单覆盖的是该上游窗口实际提供的全部操作。

API 75 增加 RSE 宝可方块盒、DP／Pt 宝芬盒与 BDSP 宝芬盒，沿用同一食物入口。
第三世代固定 40 格，每格 8 字节；第四世代固定 100 格，每格 8 字节；BDSP 固定 100 格，每格 16 字节。
种类目录使用 PokeBlock3Color（0–14）、PoffinFlavor4（0–30，包含枚举中的 FLAVOR_MAX=29）和 BDSP 的 poffin8b 名称表（编号 0–29，空位 255）。
三语文字来自 Core 的 pokeblock3／poffin4／poffin8b 资源；第四世代 29 的资源为空，显示带编号的未定义口味描述。
第三／四世代 0x00 为种类，0x01–0x05 为五项口味，0x06 为口感／光滑度，0x07 为保留字节；所有可编辑数值为 byte，范围 0–255。
两代等级只读，按 Core Level 为五项口味的最大值，不包括口感；第四世代另读取 IsManyStat、StatPrimary、StatSecondary，展示保存后的口味信息。
BDSP 种类／等级／光滑度分别位于 0x00／0x01／0x02，五项口味位于 0x08–0x0C，均为 0–255；新增标记为 0x04 的 UInt32 == 1。
新增标记不变时保留原始四字节，避免把已有异常值规范化；主动切换时调用 IsNew 写入 0／1。逐格编辑保留其余字节与其他条目。
原有未列出的种类可原位保留，新种类必须来自目录。请求必须包含 index／type，口味数组长度为 6；旧两代拒绝可编辑等级或新增标记。
RSE 补满调用 MaximizeAll(true)：40 格金色、六项数值 255；DeleteAll 清空完整 8 字节。
DP／Pt 补满调用 FillCase：100 格浓郁宝芬、六项数值 255；DeleteAll 设置 None=30 与六项 0，两者保留 0x07。
BDSP 补满沿用 SAV_Poffin8b：种类 28、等级 60、六项 255，保留新增标记；清空只调用 ToNull 设置种类 255。
BDSP 所有保存调用 SetPoffins，稳定按 IsNull 再 IsNew 排序；界面明确提示格位会变化，并提供独立整理命令。烹饪次数（0x640 的 Int32）保持不变。
列表支持按格位、种类编号、等级、口味及新增标记升降序显示，显示排序不修改存档地址；有草稿时禁止换格位／排序或批量覆盖。
第三／四世代显示格位从 1 开始，BDSP 沿用上游 0–99；请求统一使用真实的零起始地址。表单沿用 44px 控件与双列响应式布局。
依据 WinForms Gen3/PokeBlock3CaseEditor.cs、Gen4/PoffinCase4Editor.cs、Gen8/SAV_Poffin8b.cs，
及 Core 的 PokeBlock3／PokeBlock3Case／Poffin4／PoffinCase4／PoffinSaveData8b 与相应枚举、资源文件。
写出回读核对完整盒子字节（BDSP 包含烹饪次数）；原件、工作副本、撤销和导出路径保持一致。

## 独立宝可梦文件（开发中）

StandalonePokemon 直接读取 PKM，独立于 SaveFile；共享读取、基础编辑与回读校验，存档格位写入仍由原包装层负责。
输入限 1 MiB，长度必须匹配实体类型的 SIZE_STORED 或 SIZE_PARTY；已知扩展名同时用作 Core 歧义格式提示与冲突检查。
基础编辑开放 PK1／PK2 的专用表单，以及 PK3／CK3／XK3／PK4／BK4／PK5／PK6／PK7／PB7／PK8／PB8／PA8／PK9／PA9 的通用表单；其他类型尚未开放写出。
采用实体的 MaxSpeciesID、MaxMoveID、MaxItemID、MaxIV、MaxEV 和名称长度；其余基础范围沿用 PokemonEditing 的既有契约。
种类、形态与性别目录依据 PKM.PersonalInfo／Context。PK4、PK5、PK6、PK7 分别使用 HGSS、B2W2、ORAS、USUM 的实体表，
不把来源存档的较早游戏限制带入独立文件；原存档编辑继续使用 SaveFile.Personal。
编辑保持输入的存储／队伍字节长度并生成解密工作副本，导出可选存储／队伍及加密表示；写出后重新解析并核对类型、校验和与完整实体字节。
后续接口和撤销历史必须随字节保存 BK4 输入布局：编辑结果为解密布局，撤销回原始格位时同时恢复布局选项，避免重复解码。
包含队伍能力值的格式按需重算并保留序列化后的 HP／状态；CK3／XK3 的 Core Status_Condition 为非序列化属性，不能承诺写回未定位字段。
PB7 改变种类／形态时调用 Core ResetCalculatedValues，其他 CP 计算变化时更新 CP；只改昵称不重算已有体型和 CP。
BK4 只打乱数据块，校验和不能判定布局。默认按宝可梦文件读取，原始格位必须显式设置 inputEncrypted，并按 Core Decrypt4BE 处理。
从箱子长度扩展为队伍长度时，同步 BK4.IsDecryptedStateParty，与 Core 的队伍长度构造行为一致；箱子长度导出保留原标记。
上游依据：PKM/PKM.cs、PKM/Util/EntityFormat.cs、Util/FileUtil.cs、各 PKM 类型的 PersonalInfo 与尺寸属性、
PKM/Util/PokeCrypto.cs、PKM/PB7.cs，以及 WinForms Controls/PKM Editor/SizeCP.cs。
API 66 增加独立读取／编辑／导出接口与专用 Worker 客户端，不构造虚拟 SaveFile。
请求 JSON 上限 1 Mi 字符，文件名必须非空且不超过 1024 字符；单体数据上限保持 1 MiB。
客户端转移输入副本；取消、错误和 120 秒超时清理待处理请求。编辑结果按解密布局重新读取，BK4 原布局随输入快照保留。
悬浮存档工具顶部提供“存档／宝可梦文件”切换，分别保留工作状态；独立文件无需先加载存档。
中英日文入口复用实体图片与基础编辑表单，提供原件下载、最近 20 步撤销、还原原件、存储／队伍及解密／加密导出。
原始字节和 BK4 输入布局一起保存和恢复，编辑副本使用解密布局；打开失败或取消不会替换现有工作副本。
单文件最多 1 MiB，20 步历史最多 20 MiB；切换工具工作区保留文件，关闭文件清理当前副本与 Worker。
API 67 增加独立文件合法性报告，使用 Core LegalityAnalysis(PKM, StorageSlotType.None)，依据实体自身 PersonalInfo。
序列化为队伍长度不等于来自队伍格位，不据此推断合法性上下文；报告中的位置仅用于界面结果匹配。
存档格位分析继续使用 SaveFile.Personal 和真实 Box／Party 上下文；独立文件导入目标游戏后应再次检查。
中英日文摘要／完整报告沿用 Core 本地化输出，区分未完成解析与不合法；分析不修改文件，不自动修复或阻止既有导出。
读取成功的第一／二世代实体也可分析；校验损坏或空实体在入口拒绝。编辑、撤销、还原、换文件和关闭时清除旧报告。
依据：Core Legality/LegalityAnalysis.cs 与 WinForms Controls/Slots/SummaryPreviewer.cs 的独立实体构造方式。
API 68 增加独立文件进阶编辑：训练、相遇日期／等级、记忆、亲密度、训练家历史、缎带、回忆招式、闪光、PID／加密常量与形态计数。
复用存档工具的三语表单、输入范围和 PKM 字段处理；缎带、历史、记忆目录与回忆招式建议通过独立接口读取。
回忆建议使用无指定格位的 Core 合法性分析，未完成解析时拒绝生成建议；不会自动应用建议值。
形态计数的队伍限制依据实际文件长度，不信任请求中的箱子／格位。PB7 亲密度等影响实际能力值时重算能力值和 CP，保留 HP／状态。
日期能力新增 BK4／PB7／PA8／PK9／PA9，依据各 PKM 源码的 EggYear 至 MetDay 字段：
BK4 0x78–0x7D、PB7 0xD1–0xD6、PA8 0x131–0x136、PK9／PA9 0x119–0x11E。
日期仍限 2000-01-01 至 2099-12-31，空字符串清空、null 保留；相遇等级 CK3／XK3 为 0–255，其余为 0–127。
进阶编辑同样进入 20 步历史、保留原件并清理旧合法性报告。
API 69 接入独立文件的来源游戏／球种／相遇地点／蛋地点目录、游戏预览与编辑，复用“来源与地点”三语表单。
独立目录使用 PKM.MinGameID／MaxGameID／Context 的 GameUtil.GetVersionsWithinRange，以及 PKM.MaxBallID；存档入口仍使用 SaveFile 的限制。
游戏与球种另以克隆实体检查可表示性，限 0–255；只列出上游目录项。地点使用 GameDataSource.Met.GetLocationList，
PK3 相遇地点限制为 0–255，其余为 0–65535；蛋地点仅第四世代起提供。未知来源游戏以实体 Context 的默认游戏生成地点目录。
依据 Core Game/GameUtil.cs、Game/GameStrings/GameDataSource.cs、各 PKM 游戏／球种上限，以及 WinForms PKMEditor.CheckMetLocationChange／ReloadMetLocations。
已有未列出值保留展示且可保持不变，新增值必须属于对应目录；版本预览不修改文件。切离第四世代来源时按上游清除 GroundTile，其他未修改字段保留。
PKHeX 的自动识别使用来源游戏／地点等启发字段，修改这些值可能改变推测类型，例如旧来源且无传送地点的 PK5 会被识别为 PK4／BK4。
默认读取仍走自动识别和扩展名冲突检查；新增明确的“按文件扩展名读取”，仅针对上述 14 种可编辑格式，先校验精确长度，再使用对应 Core 构造器及校验和检查，不补齐文件。
工作副本在成功编辑后保留已知实体格式，导出回读也使用已知格式；文件名后缀同步格式，原件名称不变。该选项与 BK4 编码方式一起随撤销快照恢复。
来源不明的文件不应通过修改后缀猜测类型；格式选择影响后续打开的文件，不重解释当前工作副本。API 71 为 PK1／PK2 增加明确的单体列表读取。
API 70 增加独立蛋操作上下文目录与三语表单，复用转换为蛋、孵化周期、孵化按钮；显式传入目标游戏、训练家姓名及 TID16／SID16。
目录限实体 Context 内、来源目录可表示的游戏，默认优先当前来源游戏，否则使用 Context 默认游戏；训练家初值来自实体。
姓名非空、长度不超过 PKM.MaxStringLengthTrainer、拒绝控制字符；两个 ID 均为十进制 0–65535。孵化周期保持 0–255，Core 建议下限只作提示，不收窄可编辑字段。
用 SimpleTrainerInfo 提供操作上下文，不构造 SaveFile、不写回所填训练家身份，也不依赖 RecentTrainerCache。
成功操作后所选上下文与工作副本一起保留并可撤销，防止朱紫的来源字段清零后悄然改用另一版本；换文件或还原原件恢复对应快照。
转换为蛋沿用 PKMEditor.UpdateIsEgg／UpdateMetAsEgg 的交换判断、命名和记忆处理；孵化沿用 Core CommonEdits.ForceHatchPKM，朱紫无来源蛋使用显式目标版本。
UI 提醒可写入的格式／游戏不等于游戏中存在合法蛋；原存档仍由存档包装层执行全蛋队伍保护，独立文件的队伍长度不作为真实队伍证据。
依据 Core ITrainerInfo／SimpleTrainerInfo、GameUtil.GetVersionsInGeneration、EggStateLegality、CommonEdits 及 WinForms PKMEditor 的蛋控件。
内部专项与完整检查状态见进度；其他专属功能和浏览器核验仍待完成。

API 71 增加第一／二世代独立文件基础编辑、专用三语表单与单体列表导出。
依据 Core PKM/PK1.cs、PK2.cs、Shared/GBPKM.cs、GBPKML.cs、PokeList1.cs、PokeList2.cs，
以及 WinForms Controls/PKM Editor/PKMEditor.cs 的 ToggleInterface：两代不显示性格、特性与 SID，不能独立修改性别或形态。
第一世代单体列表长度为日文 59／其他文字 69 字节，第二世代为 63／73 字节；先校验精确长度、数量 1、终止标记 0xFF 与种类／蛋标记一致，再调用 Core 列表读取。
不接受缺失名称的裸实体，不补齐短文件。两代没有校验和，结构检查不能证明内容合法；合法性分析仍是独立操作。
名称缓冲区为 6／11 字节，昵称输入最多 5／10 字符，训练家姓名最多 5／7 字符；非空、拒绝控制字符和无法按当前编码原样回读的字符。
原名称未改变时不重写缓冲区，修改名称沿用 Core 的 0x00／0x50 终止方式；种类改变不自动重命名。
种类上限取 MaxSpeciesID（151／251），等级 1–100，TID16 为 0–65535；第二世代亲密度／剩余孵化周期为 0–255，道具按 MaxItemID。
四项 DV 顺序为攻击、防御、速度、特殊，各 0–15；HP DV 由四项低位计算，特殊攻击／特殊防御共享同一项。
五项能力经验顺序为 HP、攻击、防御、速度、特殊，各 0–65535，不使用后续世代的 510 总和限制。
四个招式按 MaxMoveID（165／251），PP 提升次数 0–3，PP 同时限制为 0–63 与 Core GetMovePP；空招式的 PP 与提升次数必须为 0。
等级与成长曲线不变时保留等级内经验；只有计算能力值或等级变化时重算队伍能力值，保留 HP／异常状态。
写出使用 PokeList1／PokeList2 的标准单体列表，四种存储／加密选项在这两代输出一致，因此界面不显示这些选择器。
回读验证包括实体全部字节、两个名称缓冲区、日文布局与蛋标记。编辑、导出及撤销保留原件；后续世代通用原始字段／蛋编辑仍拒绝第一／二世代。
API 72 增加第一世代捕获率／属性、第二世代捕获记录／宝可病毒，以及名称恢复和第二世代专用蛋操作。
捕获率为 0–255；属性使用 PersonalTable1.TypeIDExists 的 15 个第一世代编号，并通过 MoveType.GetMoveTypeGeneration(1) 对应三语名称。
捕获等级为 0–63，地点为 0–127 且必须属于 Core 第二世代目录，时段 0–3（未记录／早晨／白天／夜晚），原训练家性别 0–1。
PK2.CaughtData 0x1D–0x1E 的等级、地点、时段和性别通过各属性的位掩码写入，保留相邻位。
宝可病毒为 PK2.PokerusState 0x1C 的菌株／天数两段，各占四位；菌株 0–15，主动修改的天数必须在 0–Pokerus.GetMaxDuration(strain) 内。
与原值完全相同的未列出属性、地点和特殊菌株／天数组合可保持不变；不因修改其他字段而规范化已有数值。
依据 Core PKM/PK1.cs、PK2.cs、PersonalInfo/Table/PersonalTable1.cs、Game/Enums/MoveType.cs、Editing/Pokerus.cs，
以及 WinForms 的 CatchRate.cs／Designer.cs、EditPK2.cs、PKMEditor.ChangePKRSstrainDropDownLists 和 CB_MetTimeOfDay。
命名语言按现有布局限制：日文为 1，韩文第二世代为 8，其他布局为 2／3／4／5／7；使用 Core 三语语言名称和 GuessedLanguage 初值。
恢复种类名称调用 GBPKML.SetNotNicknamed(language)，不转换文件编码；明确的语言选择随工作副本保存和撤销，避免无法从蛋名推测语言时丢失选择。
第二世代创建蛋使用既有 PokemonEgg 逻辑与 Core 的最低孵化周期，并按所选语言命名；孵化使用 ForceHatchPKM 后按所选语言恢复种类名称。
PK2 的 Version 固定为 GSC，操作不需要虚构存档或额外训练家上下文，不读取隐藏的最近训练家版本；第四世代以上创建蛋仍要求上下文。
周期编辑保持 0–255；第一世代拒绝蛋操作。写出沿用单体列表标记与完整回读校验，保留原件、队伍 HP／状态与未涉及记录。
依据 Core Editing/CommonEdits.cs、PKM/Shared/GBPKML.cs、EggStateLegality.cs，以及 WinForms PKMEditor.UpdateIsEgg。
捕获率建议恢复、原始队伍字段、其他独立格式和格式转换仍待完成；专属字段接入不代表全功能完成或真实文件验收。

## 整箱二进制

BoxBinary 按 Core SaveFile 的 GetPCBinary／GetBoxBinary 导出，保留 SIZE_BOXSLOT 表示；
精确替换按 SetConcatenatedBinary 的格位宽度、解密方式和队伍尾部处理，不压缩空格、不绕过保护格位。
输入长度必须等于目标格位数 × SIZE_BOXSLOT，起始箱限制为 0 至 BoxCount−1；全部箱子模式覆盖 SlotCount 格。
预览先拒绝整个目标范围中的保护格位，再在副本逐格写入；损坏校验或非法实体使整个替换失败，不跳过格位或隐式修复。
空位覆盖与实际写入分别记录，提交沿用删除／覆盖确认。
导出重读检查格式、存档校验、箱子元数据与全部实体字节（含队伍尾部）、队伍；源文件及二进制输入保持不变。
11 格式 × 27 组设置专项已通过整箱／全箱导出与 Core 对照、空位删除、确认、保护、输入保持及固定提交检查。
默认导入在第六世代为缺失的交换记忆随机生成感受；比较时先验证双方感受合法且位于替换范围内，
仅对齐该随机字节后比较完整存档。禁用三项更新时直接逐字节相等，不归一化比较结果。
API 65 已接入独立预览会话、Worker 与三语入口，位置为存档编辑 → 宝可梦 → 整箱数据导入／导出。
预览 JSON 上限 48 Mi 字符，单个二进制文件上限 32 MiB；导出和确认 JSON 上限 4096 字符。
一次性令牌绑定源文件哈希；生成新预览或失败预览会移除旧结果，定向取消不影响新令牌。
切换箱子、修订或语言会移除界面预览；确认应用复用工作副本历史，保留原件并允许撤销。
导出允许校验通过的只读格式，导入仍受存档编辑白名单约束；文件不包含箱名和壁纸，替换时保留目标元数据。
完整工程与新版浏览器核验状态见进度；不将接口专项当作真实存档或视觉验收。

第三世代 G3PKM.Valid 固定为 true，不能代替 PK3.ChecksumValid。批量文件属性编辑、存档属性编辑和文件导入
现均显式检查校验和；损坏且解码为种类零的格位也报告异常，不作为正常空位忽略。
PK3 校验专项已覆盖该上游契约、文件／存档槽位拒绝和原件保持；不会借写出时重算校验隐式修复损坏输入。
队伍批量操作会整理并重写六个格位，因此预先检查全部队伍格位；存在损坏实体时拒绝整次操作，避免编辑其他成员时连带改写异常数据。

## 箱子批量导入契约

BoxImportPreview 已实现实体输入层的副本预览和固定结果提交，经 API 64 接入箱子批量导入入口。
源文件限 32 MiB、实体限 10000 个；起始箱索引必须位于存档箱子范围，三项导入设置均限 0–2。
仅接收可编辑且校验通过的存档，按 Core 的原始格位存在判定寻找空格，分别记录删除、覆盖、写入与跳过原因。
提交核对原文件 SHA-256，并分别要求删除、覆盖和未导入实体确认；返回预览时固定的独立字节副本。
导出后重读并核对格式、校验和、箱子元数据／内容／保护标记及队伍；无操作时保留原始字节。
11 格式专项检查已核对清空／覆盖四种组合与 Core 输出逐字节一致、空输入删除确认、过期拒绝及副本隔离。
BoxImportFiles 将文件展开并接入固定结果预览，保存文件序号、规范化相对路径与组内序号。
输入最多 10000 文件／64 MiB，总路径最多 4 Mi 字符，展开最多 10000 实体；拒绝路径穿越和重名。
沿用 Core FileUtil、BoxUtil 的实体／实体礼物／相遇／IPokeGroup／实体序列分类，显式实体扩展名沿用 PK4／PK5 解密修正。
额外处理 ConcatenatedEntitySet：以目标存档的格位宽度及 GetStoredSlot 读取；这是实体展开，精确 PC 布局替换仍需独立操作。
解析失败的组不保留部分条目；无法识别、非实体内容、空组和解析失败均进入文件结果，提交需确认未导入项。
礼物随机生成只发生在预览，提交使用固定结果。11 格式文件／PC 箱子展开、PGT 实体／道具区分、
RentalTeam8 六成员顺序、文件来源与预览联动、错误确认及礼物固定提交检查通过；完整原生套件通过。
API 64 增加 PreviewBoxImport／CommitBoxImport／DiscardBoxImport 与对应 Worker 请求。
预览 JSON 限 128 Mi 字符，确认 JSON 限 4096 字符；设置整数先检查 0–2 再转换为 Core 枚举。
重新预览先移除旧计划，失败也不恢复旧结果；定向取消不影响较新的令牌，成功提交后令牌失效。
11 格式 × 27 组导入设置已与 Core 读取同一份输入文件后的完整导出逐字节对照；
BDSP 箱子包含队伍字段，存储格式文件不含队伍尾部，对照必须使用相同文件表示。
浏览器核心构建及完整检查状态见进度。箱子工具新增“批量导入箱子”折叠入口，支持文件／文件夹、
起始箱、三项 Core 导入设置、清空和覆盖；默认三项禁用、保留已有格位，先预览再应用到工作副本。
清空范围是起始箱及其后全部箱子，允许零文件清空预览但必须确认实际删除；保护格位跳过。
预览以每页 50 行列出来源文件／组内序号、目标格位和结果，删除／覆盖／未导入项分别确认。
导入复用既有撤销记录；切换箱子、工作副本修订或语言后重建界面并取消旧预览。
中英日文已接入；实际浏览器核验及真实文件验收状态见进度，不以静态实现代替验收。

核对 WinForms SAVEditor.GetBulkImportSettings／LoadBoxes、Core BoxUtil.LoadBoxes、
SaveExtensions.GetCompatible／ImportPKMs 和 SaveFile.ClearBoxes。当前仅固定上游规则，批量导入产品入口尚未接入。

- 从指定箱开始向后寻找格位，容量耗尽后停止，不回绕到前面的箱子。overwrite=true 实际覆盖已有格位，
  XML 注释中的“仅覆盖空格”与实现相反，以实现及样本为准。
- 清空范围从起始箱一直到最后一个箱子，跳过受保护格位。Core 在枚举兼容输入前执行清空，
  因此即使输入为空并返回 -1，也可能已经删除内容。Web 必须先在副本中预览，明确列出清空范围和实际删除数。
- 覆盖模式返回 index-startCount，可能把跳过的受保护格位计入导入数量。Web 必须独立记录每次写入及跳过原因，
  不能用这个返回值作为成功文件数。只填空格模式另行计数。
- 先转换为存档实体类型，再检查 GB 语言兼容性及 EvaluateCompatibility；能够识别文件不代表能够导入当前游戏。
- 桌面文件枚举可以展开实体、可转换神秘礼物、相遇数据、IPokeGroup 与实体序列。目录默认只读顶层，
  all 参数才递归。浏览器以用户所选文件及相对路径为边界，预览须保留文件到展开实体的对应关系。
- EntityImportSettings 分别控制适配存档、图鉴更新和记录更新，取值为 UseDefault／Enable／Disable；
  All 和 None 是三项显式启用／禁用。未来 UI 需要说明会更新哪些数据，并将整个操作纳入撤销。

BoxImportContractTests 覆盖 11 格式的顺序、覆盖、清空范围、空输入、招式兼容性、容量和 Gen7 受保护格位计数；
验证状态见进度，不以契约检查代替批量导入功能完成。

## 箱子 ZIP 导出（API 63）

宝可梦页新增可折叠“导出箱子”，支持当前／全部箱子、平铺／逐箱目录、三种目录名称、
四种文件编号前缀和包含空格／无效实体选项。入口不受编辑白名单限制，要求已识别存档有箱子且校验有效。
使用当前工作副本中已应用的数据；未应用的编辑草稿不进入文件，不改变工作副本或撤销记录。
语言、禁用／忙碌、错误与下载反馈支持中文／英文／日文，沿用中性主题和 44px 控件。

上游依据：WinForms/Subforms/BoxExporter.cs、Core/Editing/Saves/Slots/Exporting/BoxExport.cs、
BoxExportSettings.cs 和 Core/PKM/Util/EntityFileNamer.cs。使用默认 Core 命名器；桌面插件命名器不在浏览器中加载。
按箱、格位遍历，最后一个不完整箱按 SlotCount 截取；默认跳过空格和无效实体。
箱内及全部格位前缀从 0 开始，箱号从 1 开始，与 Core 一致。
箱子已有完整队伍格式时保留其数值，否则 ForcePartyData 后写出解密队伍格式；Core 写出会重新计算实体校验。
选择包含无效实体并不表示修复合法性，界面明确说明这一行为。

JSExport ExportBoxes 接收 box、all、folderMode（0–1）、folderNaming（0–2）、emptySlots（0–1）、
indexPrefix（0–3）；当前箱为 0..BoxCount-1，全部范围忽略当前箱。整数与枚举值在核心再次校验。
原存档输入上限沿用 32 MiB，Web 适配限制最多 10000 个仓储格位；不从占位符推断边界。
仅在内存生成 ZIP，经 Worker archive 字段传输及 Blob 下载，不能进入存档写回链。
目录和文件使用可移植字符／NFC，处理 Windows 保留名与末尾点空格；重名追加后缀，不复用桌面覆盖行为。
没有可导出文件时报错，不触发空 ZIP 下载。桌面路径选择改为浏览器下载，声音／静默通知改为行内结果。

新增 11 格式 ZIP 路径及字节对照原生 BoxExport，覆盖全部编号前缀、范围、目录、空格、同名文件、
重复／保留目录名、请求边界、JSExport 和原存档保持。工程与浏览器检查状态见进度。

## 加密 DS 实体文件读取修复

单只导入与文件批量预览共用 PokemonFiles.TryRead。对于明确使用 `.pk4`／`.pk5` 扩展名、
长度为 Core PK4／PK5 仓储或队伍大小、Sanity 为零的输入，先在副本上调用
PokeCrypto.DecryptIfEncrypted45，再调用 FileUtil.TryGetPKM；不再把加密 PK5 的密文字节当作世代提示。
保留 Core 的校验判断，且单只导入和批量编辑都拒绝明确实体扩展名与实际类型冲突。
BK4 使用大端字节且长度可能重叠，不进入这一解密分支；未知扩展名仍使用 Core 识别行为。
不修改 vendored Core，不刷新输入校验、不覆盖原文件，API 62 协议保持。

依据为 Core PKM/Util/EntityFormat.cs 的 GetFormat45（假定已解密）、PokeCrypto.cs 的
DecryptIfEncrypted45，以及 PK4／PK5 构造函数。补充五个 DS 游戏版本、多个 PID、仓储／队伍输入、
单只导入、错误扩展名和损坏校验检查，并对照 11 格式加密／明文批量导出的 ZIP 字节；结果见进度。

## 文件批量编辑界面与 Worker（API 62）

存档编辑器新增“文件批量编辑”页签，提供多文件／目录选择、按实体格式加载属性、三语指令构建、
预览与 ZIP 副本下载。已识别存档提供识别上下文，不要求该存档可编辑，也不写入其工作副本或撤销链。
实体标识和属性名保持 Core 原名；界面操作、结果及错误使用中文／英文／日文。

- 目录选择使用浏览器的 webkitdirectory，保留相对路径；普通多选保留文件名，不读取未经选择的文件。
  在读取内容前检查数量、总大小和路径文本上限。文件顺序读取，取消后不再读取后续文件或提交迟到结果。
- Worker 新增 ReadFileBatchCatalog、PreviewFileBatch、ExportFileBatch、DiscardFileBatch；
  目录提供 Core 全部实体格式的属性与类型，不套用当前存档的格式限制。
  ZIP 用独立 archive 字段转移，不能误当作存档重新读取或应用。
- 一次仅保留一个文件预览，新预览在解析前释放旧结果，失败也不会恢复旧票据；旧票据取消不影响新预览。
  下载可重复使用同一预览的固定字节。离开页签、改变文件／指令或工作副本／语言修订时清理预览。
- 文件结果与逐组详情各以 50 行分页。识别／格式冲突和部分失败不被总成功数掩盖；
  部分错误、空值及忽略行分别确认，未确认或没有可导出文件时禁用下载。
  JSON 请求另设 128 Mi 个 UTF-16 字符的传输上限，避免无限解析；其余内核边界保持。
- 沿用标准字号、44px 控件、结果表滚动和中性主题。路径可换行，下载使用本地 Blob，未增加服务端或网络依赖。

新增票据替换／取消／重复下载／失败清理、目录 JSON 与文件读取取消检查；专项通过。
完整工程、浏览器布局、裁剪后目录和 ZIP 下载验证的当前状态见进度记录，不以原生通过替代浏览器验收。

## 文件批量预览内核

内部 FilePropertyBatch.Preview 与 FileBatchPlan.Export 最初在 API 61 阶段实现；
API 62 已接入上述 Worker 与文件批量页签，原始内核规则保持。

- 与存档批量共用 PropertyBatchCommands 解析和三语名称规则。按指令组再按输入文件顺序处理，
  每组成功后补齐队伍数据，并用原实体类型写出解密队伍格式；筛选专用组只报告匹配，不创建输出。
- 保存逐文件识别类型、状态、输入／输出大小和逐组结果；单独报告未识别、空实体、无效数据、
  扩展名冲突、筛选不匹配、部分成功和输出失败。明确实体扩展名与识别类型不符时不编辑该文件，
  加密 PK5 的识别顺序已按上述规则修复。不会因当前上下文存档的种类上限而转换或过滤其他世代实体。
- 每次输出重新识别原类型、检查有效性并逐字节重写对照。后组出现导出校验失败时，
  移除该文件此前的中间输出；其他文件可以在确认错误后导出。失败、空赋值和忽略行分别确认。
- 预览保存固定的 ZIP 结果，使用 .NET 内置 ZipArchive，不增加运行时网络或外部依赖。
  ZIP 保留相对路径、使用固定时间和无压缩存储；导出返回新数组，随机指令不会重跑。
  原文件、上下文存档和预览结果不受调用方后续修改输入／输出数组影响；没有结果时不生成空下载。
- 路径统一斜杠与 Unicode NFC，拒绝绝对路径、空路径段、`.`／`..`、控制字符、Windows 禁用字符、
  末尾空格／点及常用保留设备名；完整路径按不区分大小写查重，并拒绝文件与父目录冲突。
  不同子目录可以保留同名文件。单路径 UTF-8 长度不得超过 ZIP 名称字段的 65535 字节。
- 浏览器适配的资源上限为每批 10000 个文件、输入数据合计 64 MiB、1000000 条文件／组结果、
  指令文本 1000000 个 UTF-16 字符、路径文本合计 4194304 个 UTF-16 字符。
  这些是预览内存边界，属于 Web 适配约束，不声称来自桌面编辑器；超限拒绝整批，不静默截断。

新增 FilePropertyBatchTests：11 格式 ZIP 内容与独立编辑结果对照，覆盖混合目录、重复文件名、
三语名称、随机冻结、独立确认、只筛选预览、损坏／空实体、PK5 识别冲突、输出格式变化、
原件保持、调用方数组隔离、路径冲突及资源边界。共用解析器同时回归已有存档批量预览；结果见进度。
ZIP 的浏览器下载、裁剪后运行与真实文件验收仍需单独验证。

## 文件／目录批量编辑契约

核对 PKHeX 26.08.26 `BatchEditor.cs` 的 CreateFolderData、RunBatchEditFolder、ProcessFolder，
以及 Core 的 FileUtil、SlotInfoFile、SlotCache、EntityBatchProcessor 和 PKM.ForcePartyData。
本批只增加契约检查，API 61 和产品入口不变，文件选择与目录导出尚未接入。

- 目录递归枚举，先用 EntityDetection.IsSizePlausible 过滤长度，再以扩展名和当前存档作为识别上下文。
  当前存档不限制文件的世代，也不将实体转换为当前存档的 PKM 类型；礼物扩展名用于排除大小冲突。
- GetFormat45 在解密前读取格式提示。本次加密 PK5 工程样本经 FileUtil 被识别成 PK4，且 Valid 为真；
  已固定这项上游限制。后续适配必须对明确扩展名与识别结果冲突单独报告，不能以校验有效作为格式正确的充分条件。
  本批不宣称所有加密实体均可直接批量编辑，也未修改 Core 识别器。
- 文件来源用 SlotInfoFileSingle，Slot 筛选值为 1，没有 Box；IdentifierContains 保留文件路径信息。
  该来源不可写回存档格位。浏览器只能使用用户所选文件的名称或相对路径，不声称取得磁盘绝对路径。
- 分组在外层、文件在内层，后组使用前组修改过的同一实体缓存。每次成功处理后立即 ForcePartyData，
  再以 SIZE_PARTY 写出解密数据；原来只有仓储数据或加密的数据也使用此输出格式。
  队伍数据初始化会影响后续筛选，不能统一延迟到全部指令完成后再执行。
- 空实体和无效实体跳过；部分指令失败仍可产生成功输出，需要分别报告成功修改和失败指令。
  无匹配文件不导出。Web 适配须在输出后重新识别并核对类型、校验和实际内容，保持原始文件。
- 桌面版以 Path.GetFileName 写到目标目录，不同子目录的同名文件可能覆盖。
  Web 适配应保留安全的相对目录，并拒绝未解决的重名冲突；不得静默覆盖或直接写回来源目录。

新增 FolderBatchContractTests 覆盖 11 种合成存档对应实体的明文／加密仓储输入、混合世代识别、
来源筛选、部分成功、解密队伍导出、逐字节重读、跨组队伍初始化及原件／上下文保持。
检查结果见进度文档；这些证据不表示文件批量产品入口已经完成。

## 通用属性批量编辑（API 61）

通过 `PropertyBatch.Preview` 与保留结果的 `PropertyBatchPlan.Commit` 接入 Worker 和“通用批量编辑”页签。
页签仅在已有编辑白名单和有效校验下显示，支持三语范围选择、属性目录、指令构建与编辑、结果分页和确认应用。
目录按当前 PKM 类型从 Core 获取属性名／类型及自定义筛选项，标识不自行翻译；结果每页 50 条，不截断后台处理。
Worker 内仅保留一个预览，生成新预览即替换旧预览；取消按票据匹配释放，成功提交后不可重复应用。
离开页面、切换语言或工作副本修订时释放旧票据；后台终止和超时沿用原有取消机制。
`PropertyBatchRoots.xml` 显式保留全部 Core 批量实体类型及继承容器，新增源码清单覆盖检查。
构建后以 PKHEX_TEST_FOCUS=property-trim 运行追加检查：读取完整与裁剪 DLL 的 PE 元数据，25 个类型的属性签名、访问器可见性和方法体存在性一致。
不能直接在桌面 CoreCLR 执行浏览器裁剪程序集来验收（首次尝试出现 IEnumerator.Reset 类型加载异常）；元数据证据不替代浏览器行为。
PKHEX_TEST_FOCUS=property-preview 同时输出 11 格式原生属性目录到 .tmp，供浏览器逐项对照；发布后实际加载目录仍须核验。
接口为 `ReadPropertyBatchCatalog`、`PreviewPropertyBatch`、`CommitPropertyBatch`、`DiscardPropertyBatch`；输入和 JSON 字段由独立源生成上下文定义。
预览复制输入后执行 Core 指令，记录每组每格的处理状态与失败标志、未识别行号和空赋值。
提交分别确认部分失败、空值和忽略行，并核对源文件 SHA-256；只返回预览保存的结果副本，不重新生成随机值。
支持当前箱、全部箱子和队伍，沿用现有存档白名单。只写变化格位；队伍删除统一压缩后写回，保留其余成员顺序。
序列化后重新检查校验、类型、全部箱子内容／元数据和六个队伍格位；无变化直接保留原始文件字节。
活动语言只在同步计算期间设置，并在 finally 中还原；本实现未来必须在同一 Worker 内同步执行。
内部适配检查覆盖 11 种格式的完整文件对照、随机结果固定、过期拒绝、确认门槛、队伍重排与原件保持。
保护格位、损坏实体及多组来源筛选的增补检查通过；完整原生套件、核心构建及 verify 均通过，前端 203 文件／748 项测试通过。
新增票据替换、取消、重复提交拒绝、失败预览清理、JSON 大小写和属性目录工程检查；浏览器与真实存档验收待完成。
API 61 最终完整原生套件、核心构建与 verify 通过，前端 203 文件／748 项测试通过。
授权 Chrome 页面当前加载旧资源，和本轮最终构建不一致；未以旧页面结果验收新入口，具体资源记录见进度文档。

此项对应上游 `PKHeX.WinForms/Subforms/PKM Editors/BatchEditor.cs`、
`Controls/PKM Editor/EntityInstructionBuilder` 及 Core `Editing/Bulk/Base`、`Editing/Bulk/Entity`；
不能以箱子预设菜单代替任意属性指令编辑。

- `TryGetInstructionSets` 拒绝空文本、空白行、空筛选值；只含筛选的组用于匹配预览，不能执行修改。
  空修改值允许在额外确认后提交。Designer 未设置独立文本长度上限，不从旧页面占位符推断限制。
- 使用 Core 的文本解析器，`;` 分组，组按顺序作用于同一缓存。属性标识保持 Core 原名，界面说明与操作按三语显示。
- 筛选包含 `=`、`!`、`>`、`<`、`≥`、`≤`；赋值 `.`，计算 `+ - * / %`，位运算 `& | ^ « »`，
  值以 `*属性名` 引用同一实体属性。数值类型、溢出和除零行为由 Core 与属性访问器决定，不能统一限制为 0–255。
- `Box`、`Slot`、`IdentifierContains` 是来源条件，必须先与实体条件分离；箱号与格位从 1 开始，队伍没有箱号。
  上游存档路径跳过空槽、越界种类、无效实体和受保护箱子格位；文件夹路径单独处理。
- `TryModify` 允许 `Modified | Error`，失败指令前后的成功修改仍可能保留；`EntityBatchProcessor` 在成功后刷新校验。
  预览必须记录实际改变的格位、逐组失败和解析结果，不能把部分成功显示为全部成功，也不能以布尔结果丢弃失败信息。
- `ScreenStrings` 使用 `GameInfo.Strings` 解析当前语言的种类、道具、特性、性格、球和招式名称。
  接入时应显式提供活动语言，并避免泄漏到其他存档操作；数值、随机范围与特殊建议保持 Core 语义。
- Core 会忽略部分无法识别的文本行；界面必须展示解析数量与未识别内容，不能仅靠“无异常”判断完整执行。
- 属性目录依赖运行时反射。浏览器裁剪构建需要保留完整属性访问器，并核对发布后的目录与原生目录；
  当前原生检查不能证明 WebAssembly 属性目录完整，尚未加入产品入口或扩大编辑格式白名单。

新增 `PropertyBatchContractTests` 覆盖 11 种现有合成格式及上述指令语义，定向与完整原生检查通过。
完整 npm run verify 通过：203 文件／748 项前端测试及网页／PWA 构建；API 与产品入口未变化。
下一步核对发布后属性目录与界面行为，再继续本地文件／目录批量流程。

## 箱子批量菜单（API 60）

核对上游 `BoxMenuStrip.cs`、`BoxManipulator`、`BoxManipDefaults`、全部 `BoxManip*` 实现，
以及 `SaveFile.SortBoxes/ClearBoxes/ModifyBoxes`。入口位于箱子设置，包含删除、排序、高级排序和修改四类。
43 个动作标识来自上游枚举，实际目录按 `Usable(save)` 筛选；同一枚举的多个世代实现必须先筛可用项，
不能直接使用返回第一项的 `GetManip()`。当前编辑格式白名单不变。

- 范围为当前箱子或全部箱子，源箱编号 0–BoxCount-1；删除条件可反选，排序可反向，修改操作不接受反向选项。
- 操作不得与名称、壁纸、解锁数、标记或整箱交换混合提交；语言只接受 zh／en／ja。
- 锁定队伍阻止整个范围操作；未锁定队伍等其他受保护格位由 Core 跳过。这与整箱交换的拒绝规则不同。
- 删除／排序先展示操作与范围确认，再写工作副本；修改操作按上游直接执行。全部沿用撤销和原件保护。
- Core 排序会重写全部箱子；适配层在临时副本执行，只回写选定范围内实际变化的可写格位，保留范围外及受保护原始数据。
- 名称排序使用当前 UI 语言的 Core 种类名称，其他算法、重复判定、合法性及修改建议继续使用 Core。
- 菜单名称来自只读参考源码的 `PKHeX.WinForms/Resources/text/lang_{zh-Hans,en,ja}.txt`，保留 GPL 归属。
  DeleteForeign 按 `IsOriginalHandler` 判断，三语名称明确为初训家匹配，不沿用会误解为国家或语言的“异国”描述。
- 随机排序、随机招式及默认招式的随机回退使用 Core 随机源；检查分别核对内容集合、可学习招式池及除招式／PP／校验外的完整字段保持。
  第六世代孵化回忆的感受值先验证合法范围，再归一化对照其余全部字节。
- 来源不完整等数据可能被 Core 拒绝处理。适配层将此类异常转换为三语错误，整个临时副本丢弃，避免半批次写入。
- 全箱排序对照全部解码格位和元数据，不要求重新编码未变化空格位；删除与修改的代表操作仍核对完整文件。
- 11 种格式定向检查通过，每种提供 32–37 个可用动作。另用上游合法大岩蛇样本验证心金完整 SaveService 招式重置；
  样本归属与哈希见 [fixtures/README](../../wasm/pkhex/tests/fixtures/README.md)。
- 首次完整套件生成合成存档后，可设 PKHEX_TEST_FOCUS=box-batch 运行定向检查；提交前仍须清除此变量并运行完整套件。

最终完整原生套件、核心构建及 npm run verify 通过；前端 203 文件／748 项测试通过，网页与 PWA 构建成功。
真实存档、浏览器和完整 PKHeX 接入仍未验收。

## 箱子布局（API 59）

沿用可视化仓储的“箱子设置”，补充解锁箱数、十六进制标记和整箱交换，操作进入工作副本并可撤销。
核对上游 `SAV_BoxLayout.cs` 与 Designer、`SaveFile.SwapBox`、`BoxLayout5/6/7/8b`，
以及 `SAV4Sinnoh`、`SAV4HGSS`、`SAV8SWSH`、`SAV8LA`、`SAV9SV`、`SAV9ZA` 的访问器。

| 项目     | 输入与存储约束                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 解锁箱数 | 十进制 0–BoxCount；-1 表示 Core 不支持。Web 对支持格式的原始 0 仍提供控件，避免设为 0 后无法恢复；上游在 <=0 时隐藏控件。未改异常 byte 原值保留                                                   |
| 标记     | 数量来自 BoxFlags；普通标记 byte 00–FF，不能为空；剑／盾及阿尔宙斯由布尔块类型承载，只接受 00／01，避免 Core 静默截去高位                                                                         |
| 第六世代 | BoxLayout6 解锁数位于 0x43E，标记 0x43D；修改箱数会同步置／清标记最高位。同时提交时先写标记，再写箱数，匹配上游顺序；未改字段省略                                                                 |
| 其他存储 | 第五世代解锁数 0x3DD；第七世代标记 0x5E0、箱数 0x5E1；BDSP 箱数 0x61D。第四世代只有箱子标记，不虚构解锁数                                                                                         |
| 整箱交换 | 源／目标 0–BoxCount-1 且不同；与设置修改分开提交。使用 Core SwapBox，同步移动所有格位、名称、壁纸及格位指针；锁定、初始伙伴及对战队伍登记均由 Core 视为受保护区域并拒绝；未锁定队伍也不能直接换箱 |
| 写回核对 | 导出后重新打开，检查类型、校验及全部箱子内容／元数据、标记、解锁数和格位保护状态；不改变已有训练家／宝可梦编辑格式白名单                                                                          |

UI 继续使用共享选择器和字段组，增加还原草稿操作；存在未应用设置时禁止整箱交换。
交换完成与撤销均按工作副本修订重建表单，避免残留旧箱名或旧标记。
最终 11 种格式箱子专项与完整原生套件通过，覆盖元数据与所有格位、反向恢复、解锁与标记联动、
锁定及未锁定对战队伍登记限制、移除登记后交换、无效请求与原件保持。
核心构建、类型和完整 verify 通过（203 文件／748 项前端测试，含网页及 PWA 缓存）。
前端测试有两条 Worker 退出超时提示，测试全过且命令退出 0；其他既有警告保留。
真实存档和浏览器核验待完成。

## Z-A 图鉴（API 58）

已核对上游 `SAV_Pokedex9a.cs` 与 Designer、`SAV9ZA`、`SaveBlockAccessor9ZA`、
`Zukan9a`、`PokeDexEntry9a`、`MyStatus9a` 和 `BoxLayout9a`。
API 58 增加 `ZaPokedex.cs`、独立 Worker 协议与三语图鉴入口，沿用工作副本、撤销和导出。
`ZaBlockFixtureTests.cs` 与 `ZaPokedexTests.cs` 使用三种修订的合成分块夹具。

| 项目         | 上游字段与接入规则                                                                                                                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 图鉴地址     | 块 `0x2D87BE5C`，条目 `0x84` 字节，经 `SpeciesConverter.GetInternal9` 换算；`GetEntry` 将越界种类映射到条目 0，适配层必须在调用前拒绝越界值                                                                                      |
| 修订         | `KSaveRevision=0x0926555A` 为 uint64，Core 提供 0／1／2；构造时缓存种类上限，不能构造后再写修订来模拟旧版。适配层需核对原始 uint64，不能只信任 int 投影                                                                          |
| 种类范围     | 修订 0 上限为列阵兵，修订 1／2 为赛富豪；菜单按实际存档上限与 `PersonalTable.ZA.IsSpeciesInGame` 交集，不能照搬朱／紫目录                                                                                                        |
| 形态记录     | 捕获、见过、异色见过三组 uint32，均为 32 个独立布尔位；WinForms 会补齐无名称位，形态下拉框也是 0–31，保留未改异常 byte 原值                                                                                                      |
| 显示性别     | Designer 与 `DisplayGender9a` 的顺序为 0 无性别、1 雄性、2 雌性、3 有性别但无差异；不得复用朱／紫 0–2 的枚举                                                                                                                     |
| 语言         | 十种，ID 1–5、7–11，新增拉美西班牙语；位图 0–9，语言位之外的数据应保持                                                                                                                                                           |
| 超级进化标记 | 通常一个；X／Y、普通／Z、超能妙喵及玛机雅娜两个；米立龙三个。按 `IsMegaFormXY/ZA` 与修订决定可编辑标记，隐藏位不改                                                                                                               |
| 其他标记     | 新、头目、显示异色是非零判真的 byte；性别见过有三个独立位，超级进化位图还有未显示高位。只调用改变字段的 setter，避免规范化原值                                                                                                   |
| 批量操作     | 当前种类全部、全图鉴清除／见过／捕获／完成，Shift 包含异色。`CaughtNone` 经 `SetAllCaught(false)` 仍会 OR 额外形态捕获位且清除部分见过位；适配层改用逐条 `ClearCaught()`，清空捕获、语言和显示字段，保留见过、头目及超级进化记录 |
| 标量类型     | 当前盒子／解锁盒数为 byte，金钱 uint32，修订 uint64；训练家语言直接存于 `MyStatus9a` byte，不沿用朱／紫运行时语言块                                                                                                              |

合成夹具使用当前 `BlankBlocks9a` 和公开 SCBlock 线格式读取器，分别在构造前写入三种修订。
未知块使用合成 Object／Bool 类型，完整块表不代表历史版本；生产 `SaveUtil` 的长度和加密哈希识别不变。
覆盖完整无改动导出、全部种类的内部地址、三组形态位边界、十语言、四种显示性别、三个超级进化位，
并逐块核对未改布尔原字节、未知区、块类型／顺序／载荷与原件保持。
三个修订专项（含条目 0 的 871／1001／1001 个地址）与完整原生套件通过。
完整 `npm run verify` 通过，包含 201 文件／742 项前端测试及网页离线缓存生成；既有警告保留。
API 58 手动编辑覆盖三组 32 位形态、十语言、见过性别、超级进化、新／头目标记与显示设置。
先检查完整请求，仅写改变的字段；未改异常显示值、非标准布尔字节、隐藏位及其他块保留。
新显示形态限制 0–31，显示性别 0–3；按实际修订限制种类及超级进化选项，拒绝原始 uint64 修订越界。
草稿未应用时暂停种类切换和批量操作；形态表折叠并在内部滚动，三语名称来自 Core 资源。
训练家和宝可梦编辑白名单不随本次图鉴扩展。API 58 最终原生套件通过，三种修订分别覆盖 328／364／364 个可用种类。
手动字段使用独立字节预期，批量登记与 Core 完整输出对照，随机显示性别验证后归一化比较。
另测清除捕获、修订相关超级进化选项、缺失字段、异常值保留／修复和无效请求原子性。
核心构建、类型和完整 verify 通过（202 文件／746 项前端测试，含网页与 PWA 缓存）。
保留已有构建警告；真实存档端到端与浏览器仍待核验。

## 朱／紫图鉴（API 57）

已核对 `SAV_PokedexSV.cs`、`SAV_PokedexSVKitakami.cs` 及各自 Designer，
对应 Core 为 `Zukan9`、`Zukan9Paldea`、`Zukan9Kitakami`、
`PokeDexEntry9Paldea`、`PokeDexEntry9Kitakami` 和 `SaveBlockAccessor9SV`。
合成分块基础由 `SvBlockFixtureTests.cs` 覆盖，API 57 新增 `SvPokedex.cs`、
`SvPokedexEditor.tsx` 与独立图鉴读写协议。训练家及宝可梦编辑白名单不随图鉴扩展。

| 项目       | 上游依据与接入约束                                                                                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 格式选择   | `SAV9SV.SaveRevision` 为 0／1／2；`Zukan9.GetRevision()` 为 0／1。后两种存档共用新图鉴结构，不能把三个地区当成三个独立图鉴块                                                                        |
| 原版条目   | 块 `0x0DEAAEBD`，每条 `0x18` 字节；地址经 `SpeciesConverter.GetInternal9` 转换，不能按全国编号直接乘步长                                                                                            |
| 更新后条目 | 块 `0xF5D7C0E2`，每条 `0x20` 字节；见过／获得／听说／查看各 32 位，三个地区各有形态、性别与闪光显示字段                                                                                             |
| 原版状态   | Designer 下拉框 0–3：None／Heard Of／Seen／Captured；Core 原值是 uint32，未改异常值应保留                                                                                                           |
| 性别与语言 | 三个见过性别位独立；显示性别菜单 0–2。九个语言 ID 为 1–5、7–10，避免把无效 ID 6 当成独立语言位                                                                                                      |
| 形态       | 新版固定显示 32 项位标记，超出名称目录以编号显示；显示形态来自 Gen9 `FormConverter`。旧版霜奶仙专用形态目录可能超过 32，而 Core 位图只有 uint32，禁止把高位形态别名当成独立存储位                   |
| 地区显示   | 新版三个显示组按各形态 `DexPaldea`／`DexKitakami`／`DexBlueberry` 是否非零启用；手动更改应保留未改组和非标准布尔原字节                                                                              |
| 批量操作   | 上游提供当前种类全部、全图鉴见过无／全部、捕获无／全部、完成；Shift 控制闪光，Web 应显式呈现。需复核原版缺少新块时 `Zukan9.CaughtNone()` 对两个块的无条件访问，以及新版按基础形态设置地区字段的行为 |
| 种类上限   | `SAV9SV.Initialize` 为 1010／1017／1025；新版 WinForms 的来源仅按当前 Personal 表过滤，适配层还须按存档上限验证，避免旧修订读取越界                                                                 |
| 标量类型   | `BoxLayout9.CurrentBox` 和箱数为 byte；`MyStatus9.RuntimeLanguageId` 为 int32；金钱、LP、BP 为 uint32。以实际访问器为准，不能照搬 `KCurrentBox` 的 U32 注释                                         |

合成夹具从当前 `BlankBlocks9` 构造，通过公开 SCBlock 线格式读取器设置所测字段的明确类型，
移除用于修订判断的 DLC 块，覆盖朱／紫各三个修订。其余未知块为合成 Object／Bool 类型，
不代表历史版本的完整块表；不补齐到真实存档长度，不绕过 `SaveUtil` 的长度与加密哈希识别。
检查包括无改动完整加密输出、所有种类的内部地址、32 位边界、九语言、独立地区显示、
未编辑图鉴块和其他块的类型／顺序／字节保持，以及损坏哈希检测。
六组专项和完整原生套件通过，完整 `npm run verify` 通过（200 文件／736 项前端测试）。
首轮原生编译的语言枚举名称错误已修正；保留已有 JSExport、Hook 和网页构建警告。
上述为 API 56 基础检查；API 57 的最终检查见当前进度记录。真实游戏存档端到端及浏览器仍待核验。

API 57 的图鉴目录按存档种类上限与 `PersonalTable.SV` 可用种类交集生成，
三语种类／形态名由 Core 资源提供。原版提供状态、新标记、性别差异、九语言、
见过性别／异色、32 个独立形态位和显示字段；新版提供四组 32 位记录及三个地区显示。
未应用草稿暂停种类切换和批量操作。形态表折叠、内部滚动，可通过键盘聚焦；沿用现有控件与三语操作文本。

手动修改先检查整个请求，只调用变动字段的 Core setter。未修改的异常 uint32 状态／形态、
byte 性别、非标准布尔字节、隐藏位、对齐字节和另一套图鉴块保留。
原版 `GetDisplayGender()` 将其他字节归为 2，适配层读取原始 byte 供展示及明确修复。
新状态限制 0–3，新性别限制 0–2，新显示形态必须来自菜单；不属于该种类的地区显示组不可修改。
旧版霜奶仙的 63 个显示选项与物理 32 位记录分别呈现，不虚构高位记录。

批量差异在适配层处理，vendored Core 不变：

- 清除捕获只遍历存在的图鉴块，修复原版调用缺失 DLC 块导致的异常；两套块均存在时按上游一起清理。
- 见过操作包含最大种类编号，修复上游 `< MaxSpeciesID` 的末项遗漏；仍按图鉴归属筛选。
- 新版完整登记保留 `SeenAll` 得到的形态性别集合，使用每个实际形态的 Personal 信息设置地区显示，
  不把基础形态的地区／性别套到地区形态。显示性别继续由 Core `RandomGender()` 选取。
- 全部清除仍委托 `Zukan9.SeenNone()` 清空旧、新两个块；捕获／完整登记沿用 Core 的全语言标记，
  包括其附加的第十个位，不把该位误显示为可单独编辑的第十种语言。

全部操作进入工作副本，沿用撤销、还原、导出与加密哈希识别。写入后重新打开，核对两套图鉴块快照。

API 57 最终六组专项与完整原生套件通过：每种可用种类的全部手动字段由独立字节预期核对，
原版批量及两版见过操作与 Core 完整输出对照，随机性别单独核对合法范围后归一化比较。
另外检查新版各地区形态、旧块保持、缺块清除、异常值读取／明确修复及无效请求原子性。
三种修订各有 718／725／733 个可用种类，工程夹具含朱／紫两个版本。
核心构建、完整 `npm run verify`（201 文件／742 项测试、网页与 PWA 缓存）通过。
首轮前端测试有 worker 退出超时提示、退出 0；最终 verify 未出现该提示，其他既有构建警告保留。

## 完整接入扩展

2026-09-26 所有者要求完整接入；范围追踪见 [PKHeX 清单](../pkhex-inventory.md)。
首批新增可视化仓储，API 3（当前已扩展为 39）返回 BoxSlotCount、IBoxDetailNameRead 的盒子名称、
IBoxDetailWallpaper 的壁纸编号及上游 SpriteName 生成的图片键。
UI 按原始格位保留空位，按上游 BoxEditor.InitializeGrid 使用每盒格数 / 5 的列数；队伍显示 6 格。选择空位不显示上一只宝可梦。
图片来源为上游 Drawing 资源，按需同源加载；壁纸选择对应 WallpaperUtil.cs，
缺失资源回退上游默认壁纸/种类图片/未知图片。全部资源归属见 UPSTREAM。
可视化 API 3 批次已通过原生 11 种夹具、核心构建与完整 verify（641 项测试）。
Chrome 仍显示旧版缓存，已请求所有者刷新；本批新布局尚无浏览器验证结果。

API 4 已补充基础宝可梦编辑：昵称、等级、亲密度、初训家及原始 ID、六项 IV/EV、
四招式与 PP。招式选项使用上游本地化名称，不要求输入内部编号；目前不修改 PID、
种类、形态、性格、特性或相遇等尚未接入的字段。校验通过才替换内存工作副本，
每次修改重读并核对字段，其他格位保持不变。支持撤销及还原原文件；历史最多 20 次，
累计最多 64 MiB，至少保留上一次修改。导出从工作副本出发并叠加训练家面板草稿。
单只编辑使用 EntityImportSettings.None，避免隐式修改图鉴或交易记录。
属性编辑按核心 ResetPartyStats 重算队伍能力值；合法性报告见下方 API 5 扩展。
API 4 原生 11 种存档的队伍/盒子编辑及未选格位保持检查通过；非法位置、等级、IV、
EV、招式、PP、姓名及原始输入保持检查通过。完整 verify（184 文件 / 641 测试）、
最终增量类型检查、核心构建及核心生成后的前端打包通过。
1,546 张本地图像逐文件核对来源字节通过，来源与署名同时进入构建 legal 目录。
新界面的浏览器读写、撤销、图片加载与响应式检查仍待所有者刷新后继续；不代表完整 PKHeX。

| 编辑项        | 输入规则                                                                                | 上游来源                                     |
| ------------- | --------------------------------------------------------------------------------------- | -------------------------------------------- |
| 格位          | 队伍 0 至 PartyCount-1；盒子/位置按 BoxCount、BoxSlotCount 限定                         | SaveFile.cs                                  |
| 姓名          | 非空、禁止控制字符，按 MaxStringLengthNickname / MaxStringLengthTrainer；编码后回读一致 | PKM.cs 与具体 PKM 类型                       |
| 等级 / 亲密度 | 十进制 1–100 / 0–255                                                                    | PKM.CurrentLevel / CurrentFriendship         |
| ID            | 十进制 0–65535                                                                          | PKM.TID16 / SID16                            |
| IV / EV       | 六项十进制整数，各自 0 至 MaxIV / MaxEV；三代起 EV 总和最多 510                         | PKM.cs、EffortValues、WinForms StatEditor.cs |
| 招式 / PP     | 四项 0 至 MaxMoveID；PP 不超过现有 PP Up 对应的 GetMovePP                               | PKM.cs、WinForms MoveChoice.cs               |

## 合法性报告扩展（API 5）

选中非空格位后可分析已应用的工作副本，不自动应用尚未提交的表单值。
调用 `LegalityAnalysis(pokemon, save.Personal, StorageSlotType)`，区分队伍与盒子来源；
摘要与详细文本来自 `LegalityLocalizationContext` / `LegalityFormatting.Report`，
语言为 zh-Hans/en/ja。`Parsed=false` 显示分析未完成，不能误标为合法。
该操作只读，不改变原存档、工作副本或撤销历史；工作副本更新后旧报告失效。
位置范围沿用 PokemonEditing.Read 的核心校验，不接受空位或越界位置。
上游两个 PK3 测试样本的来源与哈希见 `third_party/pkhex/legality-fixtures/README.md`。
原生检查通过：合法/非法样本的预期结论、三语完整报告与上游一致，输入字节保持不变；
11 种存档的队伍/盒子上下文及空位、越界位置拒绝通过。
核心构建及完整 verify 通过；发现原测试配置未收集 TSX 后修正，补跑 185 文件 / 644 测试通过。
核心生成后的前端重新打包通过；保留原有 Hook、大分块与上游裁剪警告。
浏览器操作出现超时，尚未确认新界面运行结果。
遇敌数据库、批量分析和自动修复仍未接入。

## 盒子名称与壁纸（API 6）

选择盒子后展开“盒子设置”，可编辑名称并预览壁纸。应用后进入同一工作副本与撤销历史，
导出仍使用副本；只读格式不显示写入入口。未改变的字段传入 null，不自动覆盖旧值。
名称/壁纸目录来自核心，壁纸名称使用上游三语资源。第八/九世代无名称资源的壁纸使用本地化序号。

输入依据为上游 `PKHeX.WinForms/Subforms/Save Editors/Gen6/SAV_BoxLayout.cs`：

- 箱名长度：第三至五世代 8、第六/七世代 14、第八世代 16 个 UTF-16 单元。
  允许空名称；禁止控制字符，写入后字符必须与请求完全一致，拒绝编码丢失。
  BDSP 的 `BoxLayout8b.GetBoxName` 对空名称返回默认 Box N，保留该上游行为。
- 壁纸索引：第三/七世代 0–15、第四至六世代 0–23、BDSP 0–31、剑盾 0–18。
  索引按十进制整数传入；通过 `IBoxDetailWallpaper`，不手写白金/HGSS 的特殊壁纸偏移。
- 盒子位置 0 至 BoxCount-1；通过 `IBoxDetailName` 写入。输出重新打开并核对类型、校验、名称和壁纸。

本批 11 种格式的箱子编辑、数据保持、非法输入检查通过，核心构建、185 文件 / 644 测试、
类型及 lint 检查通过。保留原有警告；测试池曾提示 Worker 终止超时，最终退出 0。
核心生成后的最终前端打包通过，浏览器待检查。仓储移动、单只导入导出、解锁箱数与 BoxFlags 仍待实现，
不将上游 SAV_BoxLayout 全部功能标为完成。

## 盒内仓储操作（API 7）

选中盒内宝可梦后展开“整理宝可梦”，选择目标盒子与格位。移动只接受空位，交换保留两只
宝可梦，复制明确提示替换目标，删除清空选中格位。全部进入工作副本及撤销历史，原文件不变。
格位在界面以 1 起始显示，核心使用 0 至 BoxCount-1 / BoxSlotCount-1，禁止同一源/目标位置。

上游依据为 `SlotChangeManager.TrySetPKMDestination/TrySetPKMSource`、`SlotInfoBox.CanWriteTo`
与 `SaveFile.SetBoxSlotAtIndex`。写入前检查 `IsBoxSlotLocked`；读取锁定格位以复制允许，
修改锁定源或目标拒绝。基础宝可梦编辑也补齐相同的锁定检查。
使用 `EntityImportSettings.None`，不隐式写图鉴/交易记录；源必须非空且校验有效。
导出重开后核对类型、校验及受影响格位的完整存储载荷。

11 种格式的移动/交换/覆盖复制/删除通过原生检查，逐格确认其他盒子、队伍与原始字节不变；
相同位置、越界、空源、非空移动目标、未知操作和队伍位置拒绝通过。
US 对战队伍锁定样本验证写入拒绝，以及从锁定源复制时原格位保持。
原生检查、核心构建、185 文件 / 644 前端测试、类型和 lint 通过；核心生成后的最终前端打包通过；队伍调度、单只导入导出、批量操作及特殊格位仍待接入。

队伍调度的后续依据为 `SlotInfoParty.WriteTo/CanWriteTo` 与 `SaveFile.DeletePartySlot`：
写入空队伍位置会对齐 PartyCount，删除会前移后续成员；不能套用盒子清空语义，
需覆盖蛋/空队伍约束及队伍与盒子互换的成员顺序。该路径已在下方 API 8 接入。

## 队伍调度与损坏实体删除（API 8）

“整理宝可梦”同时用于队伍与盒子。目标可以选择同行队伍；队伍最多 6 格，源必须属于当前
PartyCount，目标为 0–5，空目标按 `SlotInfoParty.WriteTo` 对齐至 PartyCount 后追加。
界面只列出现有成员和一个末尾空位，避免多个空位表现为不同的插入位置。

删除与移出后按原顺序前移，队内/跨盒交换先读取双方数据，再统一计算最终队伍，最后使用
`SetPartySlotAtIndex(..., EntityImportSettings.None)` 写回；清空尾部格位并由核心维护人数。
放入蛋不能使最终队伍只剩蛋；队内交换按最终状态检查，保留原有非蛋成员的重排允许。
与上游删除行为一致，可删除最后一名成员；不额外限制存档编辑能力。新增的队伍数据由核心
补齐缺失的战斗能力值，不自行计算。重开核对人数及六个队伍格位的完整数据。

删除不要求宝可梦自身校验有效，可清理损坏实体；存档整体校验仍必须有效，锁定格位仍不可写。
移动、交换、复制继续要求有效源数据。上述操作共用工作副本与撤销，不改磁盘原文件。

11 种格式的跨盒调度、队内交换/复制、追加/移出/删除、队伍顺序与完整存储载荷、其他盒子及
原文件保持检查通过；越界和蛋约束通过，PK6 损坏实体删除夹具通过。
185 文件 / 644 前端测试、类型、lint、核心构建及核心生成后的前端打包通过；保留原有
Hook、大分块与上游裁剪警告。浏览器尚待新版页面检查，不代表所有者验收。

## 单只宝可梦文件（API 9）

选中队伍或盒子格位后展开“宝可梦文件”，可导入文件替换该位置，或导出选中的宝可梦。
导入进入工作副本和撤销历史，空队伍目标按 PartyCount 追加；沿用锁定格位和蛋限制。
单文件上限 1 MiB 是应用资源限制，不是 PKHeX 格式长度。拒绝空文件、无法识别的数据、
空实体及校验错误；文件扩展名转小写后交给 `FileUtil.TryGetPKM`，避免将 PGT 礼物误识别为实体。

解析由上游 `EntityFormat` 完成，转换调用 `EntityConverter.ConvertToType`，使用默认规则，
未开启强制不兼容转换；不支持的转换拒绝。写入使用 `EntityImportSettings.None`。
存档输出重开后核对类型、全局校验、队伍人数与目标完整载荷，原输入不变。
导出沿用桌面拖放的 `ForcePartyData` / `WriteDecryptedDataParty`，生成包含队伍数据的解密实体文件，
扩展名来自 PKM.Extension；下载不修改工作副本或历史。

11 种格式的队伍/盒子导出、空位/覆盖/队伍追加导入、其他格位及原文件保持检查通过；
PK3 → PK4 转换、逆世代拒绝、PGT 扩展名冲突、非法数据与位置检查通过。
185 文件 / 644 前端测试、类型、lint、核心与最终前端构建通过；保留既有警告，
测试池曾提示 Worker 终止超时但最终退出 0。浏览器新版流程尚待检查。
目录与批量导入导出、加密导出、礼物文件流程仍未完成。

## 招式 PP 提升（API 10）

每个招式新增 PP 提升次数（十进制 0–3）与恢复 PP。上游依据为
`PKHeX.WinForms/Controls/PKM Editor/MoveChoice.Designer.cs` 的四项选择，以及
`MoveChoice.HealPP` / `PKM.GetMovePP`。上限沿用核心按各格式、招式、提升次数返回的目录。
降低次数时当前 PP 降至新上限；选择空招式时 PP 和提升次数归零，禁止空招式携带非零值。
核心验证四项长度、0–3 范围及对应 PP 上限，写入后回读核对提升次数。
兼容未提供该字段的内部旧调用时保留原值；Worker 对外协议升为 10。

11 种格式分别覆盖 0/1/2/3 次提升的最大 PP 往返、超出该次数上限的拒绝及输入保持；
负数、4、错误数组长度和空招式非零提升拒绝通过。核心与最终前端构建、类型及 lint 通过，
保留既有警告。类型检查达到默认 2 GB 内存上限后以 4 GB 重跑通过；浏览器待检查。

## 性格、特性与携带物品（API 11）

新增三语选择器：性格、特性槽位、携带物品，第八世代另有能力值性格。
名称使用 `GameStrings.natures/abilitylist/GetItemStrings`，同名特性显示槽位序号。
只有更改的字段传值，未动的字段不归一化原有异常数据；仍由合法性报告判断游戏合法性。

- 性格和能力值性格：十进制 0–24；后者仅允许 Format >= 8。
  按上游 `PKMEditor.UpdateComboBox`，第三/四世代性格改变先调用 `SetPIDNature`，
  再写 Nature；第五世代起直接写 Nature，能力值性格写 StatAlignment。
- 特性槽位：0 至 `PersonalInfo.AbilityCount-1`，调用 `CommonEdits.SetAbilityIndex`。
  第三世代按桌面 `EditPK3.cs` 再写 AbilityBit；第五世代同步清除/设置 HiddenAbility，
  支持隐藏特性切回普通特性。回读必须同时匹配特性值和 AbilityNumber。
- 携带物品：0 至 `PKM.MaxItemID`，写 HeldItem 后要求回读一致。
  该范围是格式表达范围，并非所有物品都适合合法携带；使用合法性报告复核。

旧世代 PID 重新生成可能改变异色或遇敌关联，界面三语提示这一影响，修改可撤销。
11 种格式的性格/各特性槽位/物品往返、BD 能力值性格、第五世代隐藏标记清除、
其他格位与原文件保持及越界拒绝检查通过。核心及最终前端构建、类型、lint、
185 文件 / 644 前端测试通过，保留既有警告；浏览器待检查。
种类、形态、性别、PID 直接编辑及相遇/蛋等字段仍未接入。

## 种类、形态与性别（API 12）

新增按核心目录联动的种类、形态、性别选择，以及“使用种类名称”。种类范围为
1 至 `PKM.MaxSpeciesID`；形态来自上游 `PKMEditor.SetForms` 使用的
`FormInfo.HasFormSelection` / `FormConverter.GetFormList`，第三世代只有未知图腾可选形态。
性别按 `PersonalInfo.Gender` 限定雄性/雌性/无性别，双性别形态进一步匹配形态对应性别。
特性目录随所选种类/形态更新，名称均来自上游三语资源。

写入先应用种类/形态/性别，再按新 Personal 信息处理特性、当前等级的经验和队伍能力值。
旧世代调用核心 PID 辅助方法；第三世代未知图腾在其他 PID 操作后还要保持字母形态：
使用 `EntityPID.GetRandomPID` 的 FR 未知图腾约束分支同时保持形态与最终性格，
这只是约束选择，不修改宝可梦存储的来源版本。PID 改变的提示和撤销仍适用。

勾选默认名称时使用 `SpeciesName.GetSpeciesNameGeneration` / `ClearNickname`，
按宝可梦自身语言和格式生成名字；手动昵称保留。第三世代昵称状态由名字推导，
不虚构独立昵称标记。API 返回规范化请求用于导出回读核对，避免默认名更新被误判失败。

11 种格式的种类、未知图腾末形态、双性别/单一性别/无性别、经验曲线和默认名称检查通过；
支持格式的洛托姆/超能妙喵形态、自定义昵称、其他格位与原文件保持及越界拒绝检查通过。
类型、lint、核心与最终前端构建通过，185 文件 / 644 前端测试通过；保留既有警告。
测试池提示一次 Worker 终止超时，最终退出 0；浏览器待检查。
特殊形态参数、原始 PID/加密常量、相遇、蛋及缎带等字段仍待接入，不代表完整编辑器。

## 原始 PID 与加密常量（API 13）

独立高级折叠区提供原始性格值（PID）、第六世代格式起的加密常量，以及两者重新生成。
不提交普通编辑区草稿，操作仍进入工作副本和撤销历史；回读刷新关联属性及合法性报告。
输入按上游 `PKMEditor.Designer.cs` 的 TB_PID / TB_EC 使用十六进制、最多 8 位；
本项目明确要求 1–8 位 0–9/A–F，不接受空、前缀、符号或小数。核心以 uint 接收 0–FFFFFFFF。

直接写入 PID / EncryptionConstant，不通过性格、性别选择器重新生成覆盖用户值。
旧格式的加密常量是 PID 别名，不开放独立输入；不支持格式的 EC 操作在核心拒绝。
重新生成分别调用 `GetSaneGender` / `SetPIDGender` 和 `SetRandomEC`，遵循核心的来源版本规则。
这可能改变异色、性格、性别、形态或遇敌关联，界面要求应用后重新检查合法性。

队伍重算能力值但保留当前 HP 和异常状态，盒子不额外写入队伍战斗数据。
写入后按完整目标载荷核对输出，继续保护存档校验、锁定位置及原始文件。
11 种格式的队伍/盒子 PID 边界与普通值、EC 或旧格式别名、重新生成、非法范围及位置、
其他格位、HP/状态与原文件保持检查通过。核心及最终前端构建、类型、lint、
185 文件 / 645 前端测试通过，保留既有警告；浏览器待检查。
异色快捷操作、特殊形态参数和相遇/蛋等仍未完成。

## 特殊形态参数（API 14）

按 `IFormArgument` / `FormArgumentUtil.GetType` 提供独立编辑区，不支持的宝可梦不显示。
控件与写入依据为上游 `FormArgumentEditor.cs` / `.Designer.cs`：

- Raw 使用十进制 0 至 `GetFormArgumentMaxEdge`；Named 使用 `AlcremieDecoration` 的 0–6。
  霜奶仙糖饰对应上游物品资源索引 1109/1111/1110/1114/1112/1113/1115，按枚举顺序显示三语名称。
- Triple 的剩余、已过、最长保持天数分别为独立字节，允许 0–255，具体游戏规则交给合法性分析。
- 第六世代 TripleParty 的剩余/已过天数只存在于队伍区，不向盒子提供这些可写字段。
  多丽米亚在队伍中将最长保持天数与已过天数同步，在盒子中仅开放存储区的最长保持天数。
  胡帕队伍写入时已过/最长保持归零，只开放剩余天数；盒子显示存储限制说明。

操作共用高级编辑的锁定、校验、工作副本和导出回读保护，不重算无关战斗数据。
X/OR/SN/US 的适用多丽米亚/胡帕队伍与盒子计数往返、原文件、HP/状态和其他格位保持检查通过。
PK8 霜奶仙糖饰顺序、三语标签及 0/6 边界，伽勒尔哭哭面具 0/9999 边界与超限拒绝通过；
这些 PK8 检查仅覆盖实体字段，不能视为剑盾真实存档往返或所有者验收。
核心及最终前端构建、类型、lint、185 文件 / 645 前端测试通过，保留既有警告，浏览器待检查。
切换种类/形态后的参数默认值联动仍需补齐，
相遇、蛋、异色快捷操作及其余完整清单继续推进。

## 身份变化的特殊参数联动（API 15）

种类或形态实际改变时，按上游 `PKMEditor.RefreshFormArguments` 的旧控件保存、新控件加载顺序，
以及 `FormArgumentEditor.LoadValue/SaveArgument` 的模式规则处理参数：None 清零，Raw 限制到
核心上限，Named 按上游整数转换与选项数限制，Triple 保留独立计时字节。
TripleParty 队伍同步多丽米亚的最长/已过计数，胡帕按上游归零对应字节；盒子保留真实存储的
多丽米亚最长计数，不用缺失的队伍已过字节将其覆盖为零。身份未变化时不整理无关参数。

普通宝可梦编辑导出新增完整目标格位载荷比较，再核对请求字段，确保附属参数写回一致。
X/OR/SN/US 适用形态切换、普通种类清零、兼容计时保留、原文件保持检查通过；
PK8 Raw → Named 范围调整、旧 None 清零及未改变身份的数据保持检查通过（仅实体层）。
原生完整检查、类型、核心及最终前端构建、185 文件 / 645 前端测试通过，保留既有构建警告。
浏览器待检查。下一步继续相遇与蛋信息。

## 原基础范围

- 2026-09-26 所有者补充：读取必须包含队伍与盒子内的宝可梦，不能把训练家四字段称作完整 PKHeX 接入。
  新增只读宝可梦浏览器：真实盒子/位置、种类、昵称、形态编号、等级、性别、异色、蛋、性格、
  特性、携带物品、四招式与 PP、个体值、努力值、初训家、ID、PID、经验及亲密度。
  读取依据为 `SaveFile.GetPartySlotAtIndex` / `GetBoxSlotAtIndex` 和 `PKM` 属性；
  能力值展示顺序为 HP/攻击/防御/特攻/特防/速度，不沿用核心内部速度在前的数组顺序。
  API 升级为 2，Worker 同步握手；宝可梦字段本轮为只读，不等于完整宝可梦编辑器。
- 通过 PKHeX 识别存档，显示游戏、训练家、原始 ID/显示 ID、金钱、游戏时间和队伍/盒子数量。
- 首批编辑字段为训练家姓名、TID16、SID16、金钱；不提供完整桌面 PKHeX 的宝可梦、背包、事件编辑器。
- 可编辑格式白名单为第三至第八世代常规主系列及第三世代 GameCube 存档；其他被核心识别的格式只读。
- 读取失败不替换当前已打开的存档。校验失败时禁止编辑、导出和档案联动。
- 写回在原始字节的独立副本上进行；由 PKHeX 重算校验，再重新读取确认类型、校验和全部编辑字段。
- 导出新文件 `edited-<原文件名>`，不修改磁盘原文件；关闭浮层释放内存，不自动持久化存档字节。
- 档案联动使用打开的原存档身份字段，更新时保留 Seed、硬件校准和未读取标记。
  新建档案需要明确确认复核默认参数；不把默认校准值声称为从存档提取。
- 无法区分 Ruby/Sapphire、FireRed/LeafGreen 等游戏组时要求用户选择具体游戏。

## 架构

React / TypeScript → 独立 Worker → .NET WebAssembly → 原版 PKHeX.Core。
不增加服务器、账号、上传、运行时 CDN 或跨源隔离；按需加载同源打包资源。
现有 RNG C++/Emscripten 路径保持不变。新增 .NET 仅用于存档 I/O。

### 2026-09-26 接入方式复评

继续保留原版 PKHeX.Core，由 TypeScript 负责界面与联动。纯 TypeScript 适合少量固定
世代的只读字段；跨世代编辑需要自行维护格式识别、编码、加密、校验和容器规则。
C++/Rust 重写同样存在维护成本；原生 C# 可作为未来桌面适配器，网页不依赖本机服务。

当前本地运行时目录约 33 MiB（未压缩文件合计，非网络传输量）。核心按需加载，
PWA 初始预缓存排除 `pkhex/**`，启动文件使用 NetworkFirst，带哈希资源使用 CacheFirst。
已验证首次在线加载后，关闭本地服务仍可重新打开页面、读取和导出存档。首次离线使用不支持；跨核心版本更新尚未实测。

Ultra Sun 合成样本浏览器读取成功，导出暴露 .NET 浏览器 AES 缺失。
通过上游 `RuntimeCryptographyProvider` 注入同步 AES ECB/CBC 和 MD5，使用
`@noble/ciphers` / `@noble/hashes` 2.4.0，vendored 核心保持不变。
适配依据为 `Saves/Encryption/Providers/`；新增 7 项与 Node 原生加密对照的测试通过。
US/BD 浏览器导出与原生输出逐字节一致，详见验证记录。

本地构建工具为 .NET SDK 10.0.401、`wasm-tools`；通过 npm 入口运行：

```text
npm run pkhex:build
npm run pkhex:test
```

脚本优先使用 `PKHEX_DOTNET`，其次项目 `.tools/dotnet`，最后 PATH。
浏览器资源生成到忽略跟踪的 `public/pkhex/`，完整构建必须生成并包含这些资源。

## 已核对输入与上游依据

| 输入          | 范围/行为                                                                        | 来源                                     |
| ------------- | -------------------------------------------------------------------------------- | ---------------------------------------- |
| 文件          | 1 字节至 32 MiB；空值拒绝，按内容识别                                            | 本工具资源上限；`Saves/Util/SaveUtil.cs` |
| TID16 / SID16 | 0–65535，十进制、最多 5 位，空值拒绝                                             | `Saves/SaveFile.cs` 的 `ushort` 属性     |
| OT            | 非空，最多 `MaxStringLengthTrainer`；第三世代日文最多 5 字符；编码后回读必须一致 | `SaveFile.cs`、`SAV3.cs`                 |
| Money         | 0–`MaxMoney`，十进制，空值拒绝                                                   | 各 SaveFile 实现及 `SaveFile.MaxMoney`   |
| 3DS TSV / TRV | `(TID16 ^ SID16) >> 4` / 低 4 位                                                 | 现有 `3dsprofiles` 档案格式              |

读取入口使用 `SaveUtil.GetSaveFile`；写回使用 `SaveFile.Write`，包含 `SetChecksums` 和容器封装。
按所有者本轮明确要求，存档工具优先按当前语言显示。中/英/日资源接入 i18next；
中文使用“存档编辑器”“训练家姓名”“金钱”等描述，不再强制保留 OT / Save Editor。
宝可梦种类、招式、性格、特性和物品名称来自 PKHeX `GameStrings`，使用 zh-Hans/en/ja；
物品按宝可梦世代与版本选取对应表，存档中原有昵称、姓名和文件名不翻译。

## 验证状态

2026-09-26 宝可梦读取补充：`pkhex:test` 的 11 种合成存档通过队伍、首盒与末盒位置、
中文种类名、英文招式名和 IV/EV 展示顺序检查；新增数据的 `pkhex:build` 与前端打包通过。
完整检查先发现加密测试缺少 Node 类型声明，补齐后默认 2 GB 类型检查进程内存不足；
使用进程级 `NODE_OPTIONS=--max-old-space-size=4096` 重跑通过完整 verify：184 个文件、
641 项测试、TypeScript、ESLint 与 Vite/PWA 构建；不修改应用运行时设置。
所有者刷新后，外部 Chrome 已在原有本地页面确认新版入口。US 合成存档队伍、
第 32 盒第 30 格读取正确；攻击个体值 27、速度努力值 12 与样本一致。
中/英/日入口、宝可梦名称及招式切换通过，中文训练家姓名、金钱与导出操作已确认，
未捕获控制台错误；桌面首屏截图未见遮挡，最后恢复中文界面。
新宝可梦面板手机布局与自动跨版本更新仍待检查。以下 640 测试及浏览器结果属于此前基础版本。

2026-09-26 已完成本轮基础读取、四字段编辑和档案联动的工程验证。未提交、推送或发布；
下述结果不代替所有者验收，也不代表完整桌面 PKHeX 功能或全部真实存档兼容性。

- `npm run pkhex:build` 通过，使用 .NET 10.0.401 / wasm-tools，保留上游反射裁剪警告。
- `npm run verify` 通过 183 个文件、640 项测试、TypeScript、ESLint 和前端构建。
  测试池出现一次 worker 终止超时提示，最终退出 0；原有 Hook 依赖和大分块警告仍在。
- 随后修正坏校验重复提示，`npm run build:web:bundle` 通过；预缓存 252 项 / 22722.61 KiB。
- `npm run pkhex:test` 在修正测试自身的数组隔离后重跑通过：E、D、Pt、HG、B、B2、X、OR、
  SN、US、BD 共 11 种合成存档，覆盖字段回读、校验、原始字节及非空箱子/队伍数据保留。
  上游读取可能清理签名区，测试与产品均传入独立副本，不能直接读取待对比原始数组。
- 负向检查覆盖不支持文件、坏校验、越界金钱、过长姓名和原文件保留；7 项 JS 加密测试
  对照 Node 原生 AES/MD5，覆盖 ECB/CBC 和 128/192/256 位密钥。

授权的外部 Chrome `http://127.0.0.1:5173/` 验证：

- Emerald 导入、四字段编辑、下载副本、重新导入校验及第三世代测试档案写入成功。
- US/BD 浏览器导出与相同输入的原生导出 SHA-256 一致，US 副本回读校验通过。
- 无效文件不会替换当前已打开存档；坏校验 E 禁止字段编辑和导出。
- 正式构建先在线读取 US，再关闭预览服务并确认 5173 无监听。页面重载后仍能读取 US、
  编辑并下载副本，SHA-256 与在线及原生输出一致；随后恢复预览服务。
- 桌面加载后截图未见遮挡；390px 空面板、加载后边界和主要控件尺寸检查通过，Escape 可关闭。
  加载后手机截图接口仍超时，未声称完成手机逐像素视觉验收。

导出对照指纹（OT=EDIT、TID16=65535、SID16=0、Money=500）：

- US：`0a8108ab7fc5e169cb3ef2974e7a3d1450aacbfa9ae2a6ca4369e85f55f53a86`。
- BD：`33ef74ea418a7d43ddacd0d6d73ddfd5b954ca7c44c4863fdf3cc94709dd0a31`。

## 已知限制

测试使用本地合成存档，不读取用户私人存档。剑盾上游空白模板使用未序列化的
`SCTypeCode.None`，只能验证拒绝，不能算剑盾读写通过；GameCube、未覆盖版本和真实主机
存档仍需对应样本验证。核心版本升级须重做格式/加密回归，PWA 跨版本更新尚未实测。
本轮不增加宝可梦、背包、事件编辑器，不把默认 Seed、校准或护符标记当作从存档读取。

## 相遇等级、日期与标记（API 16）

独立相遇记录编辑区支持相遇等级、命运相遇标记，以及适用格式的相遇日期和获得蛋日期。
仅发送变更字段；空日期显式清除年月日，未变更的日期包括无效原始字节均保留。
所有修改复用内存工作副本、撤销与完整目标载荷写回核对，不重算队伍能力值或治疗。
本阶段不改变来源游戏、地点、蛋状态，也不替代合法性检查。来源与地点目录、蛋转换仍待接入。

输入依据为上游 `PKHeX.WinForms/Controls/PKM Editor/PKMEditor.Designer.cs` 的
`TB_MetLevel` 三位输入与 `Update255_MTB`、`CAL_MetDate/CAL_EggDate` 的 2000–2099 年范围，
及 `PKHeX.Core/PKM/PK3.cs`、`PK4.cs`、`PK5.cs`、`PK6.cs`、`PK7.cs`、`Shared/G8PKM.cs`
与 `CK3.cs/XK3.cs` 的实际字段宽度。普通格式相遇等级限制 0–127；CK3/XK3 为 0–255，
防止 7 位字段溢出到来源游戏或初训家性别。日期采用严格 `yyyy-MM-dd`，
允许 2000-01-01 至 2099-12-31 的真实日期；第三世代不开放日期。
PKM 日期转换与清除沿用 Core，命运相遇沿用各格式属性实现。

11 种存档的队伍/盒子导出重读、等级边界、日期写入/清除、其他格位与原文件保持通过；
另覆盖 CK3/XK3/PK8 等实体边界、非法日期拒绝、无效原始日期保留及受伤/异常状态保持。
原生检查、类型、lint、185 文件 / 645 前端测试、核心及最终前端构建通过，保留既有警告。
补充原生检查曾与核心构建发生文件占用，核心构建结束后单独重跑通过。浏览器交互仍待检查。

## 来源游戏、球种与地点（API 17）

新增独立来源与地点编辑区，按需通过 Worker 查询三语目录。切换来源游戏仅更新候选项，
不会修改工作副本；原有值不在新目录时以编号保留并标明，实际应用仅提交变化字段。
相遇地点、获得蛋地点与日期/蛋状态相互独立，不自动生成遭遇数据；第三世代不开放蛋地点。
来源改为非第四世代时沿用上游规则清除地面类型，其余字段保持。

目录依据为 `Game/GameStrings/FilteredGameDataSource.cs` 的游戏与球种范围、
`Game/GameStrings/MetDataSource.cs` 的来源/当前格式/蛋目录，以及
`PKHeX.WinForms/Controls/PKM Editor/PKMEditor.cs` 的来源与地点更新规则。
三语分别构造 `GameDataSource`，不改变全局语言；选项按真实 ID 关联。
游戏取 `GameUtil.GetVersionsWithinRange(save, save.Context)`，保留上游 0 值选项，
并要求属性读回一致；球种取上游目录与 `save.MaxBallID`，过滤当前来源下无法精确保存的球种。
PK3 地点为 8 位（0–255），CK3/XK3 与高世代为 16 位；变更必须存在于对应目录。
BDSP 的无地点值及外部来源在 BDSP 格式中的目录调整由上游提供，不假设无地点等于 0。
未修改的不在目录值仍保留。核心写入后核对请求值、相遇等级、初训家性别，
导出再验证完整目标载荷与校验；原文件、其他格位、队伍健康状态保持。

11 种存档的目录查询、来源预览、球种/地点编辑、边界拒绝、写回与原文件/其他格位/受伤队伍保持通过。
覆盖 BDSP 格式的旧世代来源与特殊无地点值，以及非第四世代来源清除地面类型。
类型、lint、185 文件 / 645 前端测试、核心及最终前端构建通过，保留既有警告。
外部 Chrome 与本地预览已重新核对并重启服务，页面仍读取旧的 `index-BbDn0w3C.js`，
本轮构建为 `index-CUNbP2mS.js`；没有用旧页面作为新增功能证据。
浏览器检查待恢复，蛋状态转换、遭遇建议/数据库和其他完整清单仍待完成。

## 孵化周期与核心孵化（API 18）

蛋详情新增剩余孵化周期编辑与核心孵化动作，三语界面、独立应用并支持撤销。
周期写入 `OriginalTrainerFriendship` 的 0–255 字节；不能把当前持有者亲密度当作蛋周期，
因此列表和基础编辑在蛋状态下也改用原训练家字节，界面区分周期与剩余步数。
依据为上游 `PKMEditor/LoadSave.cs` 的 `LoadMisc2/SaveMisc2`、
`PKMEditor.Designer.cs` 的友情度字节输入，以及 `EggStateLegality.GetMinimumEggHatchCycles`。
提示格式最小值，但不把存储范围当作合法性结论。

孵化直接调用 `CommonEdits.ForceHatchPKM(save)`，由核心修改蛋标记、默认名称、
原训练家亲密度、适用的地点/日期/来源与第六世代记忆；不会应用未保存的周期输入。
不重算或治疗队伍健康数据，不触发存档图鉴/记录自动更新。只对已有蛋开放；
普通宝可梦转为蛋、孵化来源建议和其余蛋相关完整功能仍待接入。
`MemoryApplicator.SetHatchMemory6` 随机生成合法感受值，验证时先检查允许范围，
再对齐该随机值与校验字节后核对其余完整数据，不要求独立调用抽到同一个值。

11 种存档的队伍/盒子周期边界、核心孵化完整数据、原文件/其他格位/受伤状态保持通过；
覆盖另一位持有者亲密度不被周期编辑覆盖，以及普通基础编辑对蛋周期的正确写回。
第六世代随机感受值按上游允许范围验证后核对其余载荷，保留随机核心行为。
类型、lint、185 文件 / 645 前端测试、核心及最终前端构建通过，保留既有警告。
浏览器待检查；转为蛋及其余完整功能继续推进。

## 转换为蛋（API 19）

普通宝可梦详情新增转换为蛋动作，沿用 `PKMEditor.UpdateIsEgg/UpdateMetAsEgg` 的联动：
设置蛋标记、格式最小孵化周期、核心蛋名称与昵称标记，清除第六世代以后的适用记忆。
已有获得蛋记录保留；此前不是蛋来源时，以核心建议地点及当前日期创建记录。
根据存档与宝可梦的初训家名字/TID/SID 判断持有者差异，设置交易蛋地点或格式无地点值；
无地点时清除相遇日期，交易蛋采用上游 2000-01-01 初值。
第三世代掌机 PK3 使用属性自带的日文蛋规则，保留初训家原始字节，界面提示语言导致的显示变化。
不改经验值、种类、PID、招式或队伍健康状态；转换后的合法性需另行检查，不宣称自动合法化。

没有新增自由数值输入，复用 `EggStateLegality.GetMinimumEggHatchCycles`、
`SpeciesName.GetEggName`、`EncounterSuggestion.GetSuggestedEncounterEggLocationEgg`、
`LocationEdits.GetNoneLocation`、`Locations.TradedEggLocation` 与核心记忆清理。
已是蛋或混入周期参数的转换请求拒绝；队伍转换前检查其他槽位至少还有一只非蛋宝可梦。
工作副本、撤销、导出校验与完整载荷核对沿用现有流程。

11 种存档的队伍/盒子转换往返通过，分别覆盖原训练家与交易持有者，
验证名称/周期/相遇记录、已有蛋记录保留、初训家字节/其他格位/健康状态保持及全蛋队伍拒绝。
类型、lint、185 文件 / 645 前端测试、核心和最终前端构建通过，保留既有警告。
浏览器仍待恢复新版页面后检查；异色操作等其余完整清单继续推进。

## 异色操作（API 20）

独立异色编辑区提供 PID 与隐藏训练家 ID（SID）两种方式，以及任意异色、星形 XOR=1、
方形 XOR=0 和取消异色。两种方式都不修改存档训练家或资料卡；界面说明 PID 的遭遇关联
与 SID 的原训练家身份影响。配信、GO 来源和游戏的实际异色表现不只由 XOR 决定，
因此请求值与游戏表现分别说明，不宣称生成合法遭遇。

输入为固定枚举，依据上游 `PKMEditor.UpdateShiny`、`PKM.SetShinySID/SetPIDGender`、
`CommonEdits.SetUnshiny`、`EntityPID.GetRandomPID` 和 `Shiny.IsValid`。SID 异色调用核心，
取消异色将 XOR 调整为 16，保留 PID/EC/TID 及队伍其他数据。PID 路径沿用上游来源世代的
性格、性别和特性位约束；PK3 未知图腾额外保持形态，取消异色时使用 FR 的形态约束生成分支，
随后恢复原来源游戏。第三至第五世代来源处于高世代格式时同步 EC=PID。

为避免指定未知图腾形态与 XOR 无解造成无界循环，PID 异色路径枚举全部 65,536 个低位
与目标 XOR（旧格式 0–7，新格式 0–15；指定类型为 0 或 1），由 TID/SID 计算高位，
逐项检查核心同源约束。随机选择遍历起点；无解返回三语错误且不写入工作副本。
只允许物种可表达的性别及 0–24 性格进入 PID 编辑，不要求原 PID 已经与性别一致。

11 种存档的队伍/盒子 PID 与 SID 双路径、非异色起点转换、指定 XOR、取消异色、
原文件/其他格位/健康状态保持通过。未知图腾 28 形态在测试 ID/性格条件下，
16 种可生成方形，12 种无解且保持输入；覆盖取消异色时形态/来源保持。
旧来源 PK6 的 EC 同步包括已经满足异色类型时的应用。
类型、lint、185 文件 / 645 前端测试、核心及最终前端构建通过，保留既有警告。
浏览器待检查；其余完整清单继续推进。

## 回忆招式（API 21）

独立折叠区编辑四个回忆招式槽位，使用已有的核心中、英、日招式目录。
建议按钮读取 PKHeX 合法性分析结果，只填入草稿；明确应用后才写入工作副本并进入撤销历史。
清空操作同样仅改变草稿。回忆招式不会覆盖当前四招式、PP、PP 提升次数或队伍健康状态。

依据上游 `PKM Editor/LoadSave.cs` 的四槽读写、`PKMEditor.SetSuggestedRelearnMoves`、
`PKM.SetRelearnMoves` 与 `LegalityAnalysis.GetSuggestedRelearnMoves`。
输入必须恰好四个整数，每个范围为 0 至实体 `MaxMoveID`，0 表示空槽；保留槽位顺序、重复值和中间空槽，
不自动整理或把建议当作合法性通过。原有目录外值可显示，提交时仍受格式范围约束。
只对实际保存这些字段的 PK6、PK7、PB7、G8PKM、PA8、PK9、PA9 返回字段，旧格式隐藏入口。
可写存档范围仍由既有格式白名单限定，不因实体支持而放宽整个存档的写入范围。
建议在 Worker 中读取副本，使用存档 Personal 与队伍/盒子上下文，取消或切换宝可梦后丢弃过期结果。

X、OR、SN、US、BD 的队伍/盒子四槽往返、只读建议与 Core 一致、空槽/重复/范围校验、
当前招式/PP/健康状态和其他格位保持检查通过；另以实体检查其余支持格式。
既有 11 格式原生套件、类型、lint、185 文件 / 645 前端测试及核心/前端构建通过，保留既有警告。
浏览器新布局仍待检查，完整清单继续推进，未提交或推送。

## 缎带与证章（API 22）

缎带目录在选中宝可梦后按需读取，使用上游三语名称，支持名称搜索、仅显示已拥有、
逐项开关、数量编辑及佩戴项。列表限制滚动高度，复用标准字号和控件尺寸。
全部填满/清空作用于整份草稿，不受搜索过滤影响；清空同时取消佩戴。应用后进入现有撤销历史。

字段依据 `RibbonInfo.GetRibbonInfo`、`IRibbonSet*` 与上游 `RibbonEditor.Save/InitializeAffixed`。
本地使用 14 组接口的静态读写映射，避免 Wasm 裁剪依赖反射属性；测试对照上游反射结果核对完整字段集。
布尔项范围 0–1；旧华丽大赛计数 0–4，华丽大赛回忆 0–40，对战回忆 0–8，取自 `RibbonInfo.MaxCount`。
数量写入保留核心 setter 对回忆缎带标志的联动。佩戴仅限 `IRibbonSetAffixed`，
范围 -1（不佩戴）至 `AffixedRibbon.Max`，与桌面选项一致；不强制已拥有或自动改变其他缎带。
拒绝未知属性、重复键、负值、超界值及不支持的佩戴字段，不允许任意属性写入。
草稿只提交改动字段，不夹带未修改的异常原值；原目录外佩戴值显示编号。
完整目标中的图标、合法性颜色提示以及按合法性批量建议仍待补齐，不将窗口整体标记完成。

15 种实体的字段集/本地化/上限与上游一致；11 种存档的队伍/盒子填满、清空往返通过，
核对完整目标载荷、其他格位、健康状态、校验及原文件保持。类型、lint、185 文件 / 645 前端测试、
核心及最终前端构建通过，保留既有 lint/裁剪警告；测试进程清理超时提示不影响退出码 0。
浏览器待检查，完整清单继续推进，未提交或推送。

## 缎带与证章图标

2026-09-27 加入上游 161 张未修改 PNG，按 Resources.resx 键映射，来源路径和 SHA-256 追加到资源清单。
列表每项显示本地图标，原生名称仍为可访问标签；装饰图像使用空替代文本与固定 32px 占位，按需加载。
选择规则沿用 RibbonSpriteUtil：旧华丽大赛数量 2/3/4 对应 super/hyper/master，其他值使用普通图标；
回忆缎带达到计数上限切换第二图标，第九世代对战回忆按 RibbonEditor 使用阈值 7，输入上限仍为 8。
未知资源隐藏图像而保留名称，不生成错误 URL；无外部 CDN。161 张资源哈希、全部字段数量范围和分级规则共 3 项检查通过。
类型、lint、前端构建与格式检查通过，保留原有 lint 警告；本批未改变核心，未重建核心。
Chrome 重新刷新仍加载旧入口 index-BbDn0w3C.js，当前构建为 index-Bi9LUqVe.js，新图标尚未在浏览器核验。
合法性颜色提示与批量建议仍待补齐，浏览器布局待检查。

## 缎带合法性辅助（API 23）

按需读取缎带时运行核心分析，展示缺少、存在问题、核心认为可获得、遭遇证章及未完成分析状态。
缺少/问题状态取自 `RibbonVerifier.GetRibbonResults` 和 `RibbonResult.IsMissing`；
依据上游 RibbonEditor 使用 EncounterOriginal 与进化历史。可获得提示取自对副本运行
`RibbonApplicator.SetAllValidRibbons` 后的字段状态，读取不修改原宝可梦。
状态描述已应用的数据，不随草稿伪装为重新分析；提示带文字，不能代替完整合法性报告。

新增按核心建议设置、按核心规则精简两个可撤销操作，对应桌面 Shift+All / Shift+None。
建议先调用 RemoveAllValidRibbons，再 SetAllValidRibbons；精简只调用前者并取消佩戴。
保留核心处理必需项的规则，建议可能同时联动超级训练完成位、训练解锁和华丽大赛组合缎带。
完整载荷验证覆盖这些关联字段，不将修改错误限制为缎带位。两种操作不接受混合手动字段，
分析未完成时拒绝；前端有草稿时禁用，并提供还原草稿按钮。
不修改队伍血量/状态、其他格位和原文件，不宣称修复所有合法性问题。

11 种存档的队伍/盒子提示、建议与精简往返检查通过，完整写入载荷与直接调用核心一致，
包括超级训练等关联字段；校验、原文件、其他格位与队伍健康保持通过。
类型、lint、186 文件 / 648 前端测试、核心和最终前端构建、格式检查通过，保留既有警告。
浏览器仍加载旧入口，新界面未验收；完整清单继续推进。

## 构建依赖来源修正

2026-09-27 首次推送扩展后的 Actions 在 npm ci 阶段报 EALLOWREMOTE，拒绝锁文件中的
registry.npmmirror.com 地址。将 @noble/ciphers 与 @noble/hashes 的 resolved 改为官方
registry.npmjs.org；版本保持 2.4.0，SHA-512 与官方 dist.integrity 逐项一致。
不更改依赖内容或安装安全策略。修复提交 738424c 的 Actions 36259551366 已全部成功，
包括网页构建、GitHub Pages/Cloudflare 部署和 Windows 打包。

## 训练家记忆（API 24）

按需读取原训练家与接手训练家的记忆内容、关联参数、程度和感受，使用核心中、英、日目录。
依据上游 MemoryAmie.LoadFields/SaveFields/GetLangStrings/UpdateMemoryDisplay、MemoryStrings、
Memories.GetMemoryArgType 与 ITrainerMemories。原训练家的参数按来源世代（0 时回退格式）生成，
接手训练家按当前格式生成；感受列表分别按来源世代与格式选取，与桌面规则一致。
参数目录随记忆联动为宝可梦、地点、道具或招式；不开放任意数值绕过目录。
程度 0 使用本地化“无”，无记忆会清空关联参数、程度和感受；没有参数选择的记忆写入变量 0。
底层字节/ushort 位宽与目录成员双重校验。原值不在目录时保留编号显示，提交仍受目录约束。

旧来源原训练家记忆、未接手的空训练家记忆沿用桌面禁用条件；不伪造接手身份以启用字段。
内容切换重置关联参数，清空先进入草稿；切换训练家前必须应用或还原草稿。
完整文字使用已本地化的名称填入核心模板，不直接向使用者显示内部变量占位符。
写入只改变选定训练家四项记忆，保留另一组、健康状态与其他存储格位。居住记录、好感、
饱食/愉悦等 MemoryAmie 的其他区域仍待接入，不将整个窗口标为完成。

同时为工作副本更新增加前端修订号：应用、撤销和还原后，缎带及记忆的旧草稿失效，下次读取使用新工作副本，
保留当前盒子/格位选择，避免摘要未变化时沿用旧草稿或旧分析提示。
X、OR、SN、US、BD 五种存档的队伍/盒子双训练家记忆、全部参数类别、清空、边界及完整载荷保持检查通过。
原生套件、648 前端测试、类型、lint、核心及最终前端构建通过，保留既有警告。
浏览器仍待新版页面核验，完整记忆窗口与 PKHeX 清单继续推进。

## 亲密度与互动数值（API 25）

记忆与互动面板新增原训练家/接手训练家亲密度、好感度、饱食度、愉悦度和社交度。
依据上游 `MemoryAmie.LoadFields/SaveFields`、Designer 的三位数字 Mask 与 `Update255_MTB`，
以及 `IAffection`、`IFullnessEnjoyment`、`ISociability` 和 `G8PKM.Sociability` 的实际存储。
全部编辑使用十进制整数 0–255；空值或小数草稿不能提交。好感度仅在实现对应接口的第六/七世代显示，
饱食/愉悦按接口显示；社交度按桌面保存路径仅允许 G8PKM 写入。
社交度底层为 uint，读取保留完整原值，不因上游显示上限而截断；只写入明确修改项。

接手训练家亲密度/好感度沿用上游组禁用条件；旧来源的原训练家好感度仍允许编辑。
蛋的原训练家亲密度字节显示为剩余孵化周期，并说明与孵化进度的关系。
编辑先进入草稿，应用进入可撤销工作副本；不改变记忆、当前持有者身份、健康状态、其他格位或原文件。
居住记录和当前持有者切换仍待完成，不将整个 MemoryAmie 窗口标为完成。
五种存档队伍/盒子的逐字段边界写入、完整载荷、原文件、健康状态和其他格位保持通过。
补充不支持字段、禁用训练家、重复项、越界、蛋周期和较大社交度原值保持检查。
原生套件、186 文件 / 648 前端测试、类型、lint、核心与前端构建通过，保留既有警告。
Chrome 重试读取后仍加载 index-BbDn0w3C.js，
新界面仍待浏览器核验。

## 持有者与居住记录（API 26）

增加按需读取的独立记录面板，保留三语、草稿、撤销和工作副本修订号失效机制。
上游 MemoryAmie.Designer 的 CB_Handler 明确禁用，仅显示当前持有者；真正切换来自
PKMEditor.ChangeHandlerIndex/UpdateHandlerSelected 和 LoadSave.ToggleHandlerVisibility。
仅允许 0/1，选择接手训练家必须已有姓名；只写 CurrentHandler，不模拟交易、不覆盖两组亲密度和记忆。
原值异常时保留编号，允许回到原训练家；界面中的当前亲密度随核心读取对应训练家值。

居住记录依据 MemoryAmie 的五组国家/地区、ChangeCountryIndex、ClickResetLocation、B_ClearAll_Click
以及 IGeoTrack 的十个 byte 字段。仅有 IGeoTrack 的格式显示五组记录；国家与地区采用
Util.GetCountryRegionList 的 countries / sr_NNN 三语目录，首次读取后在 Worker 中缓存目录。
索引为 0–4，国家/地区为 0–255 且必须属于对应目录；国家 0 写入地区 0。
更换国家重置地区为该目录首项；选择空国家等价于清空。保留未知原值编号供核对，提交变更仍受目录约束。

普通国家/地区选择沿用上游禁用条件：未离开原训练家的现代来源非蛋，只开放第一组。
上游的单行标签清空和全部清空按钮不受该选择禁用影响，因此仍允许显式清空其他组。
清空只写目标组的 0/0，不自动排序、压缩空位或联动出生国家；仅提交改变的行，保留其他原值。
按需读取不改变存档；应用后核对完整宝可梦载荷，不修改健康状态、其他格位或原文件。
X、OR、SN、US 的五组居住记录与 X、OR、SN、US、BD 的持有者切换往返通过。
完整载荷、健康状态、其他格位、校验和原文件保持通过；国家/地区三语目录与上游逐项一致，
覆盖禁用选择、显式清空、空位保留、越界、重复索引及 PK8 实体级持有者检查。
原生套件、186 文件 / 648 前端测试、类型复核、变更文件 lint、核心与前端构建通过，保留既有构建警告。
浏览器待新版核验，不将工程结果视为所有者验收。

本批同时分离读取与编辑的禁用条件：只读存档可发起训练家记录、记忆、缎带和来源目录读取；
记忆所属训练家切换、缎带搜索/持有筛选仍可用。写入字段与应用按钮继续受存档编辑资格限制，
不支持的具体实体能力仍由核心拒绝，不借读取入口放宽存档写入范围。

## 极限特训与华丽大赛（API 27）

存档报告按实体接口返回训练字段；没有对应能力的格式不显示该区域，只读存档仍能查看。
华丽大赛依据 PKHeX.WinForms 的 ContestStat、LoadSave.LoadMisc3/SaveMisc3 与
IContestStatsReadOnly/IContestStats：帅气、美丽、可爱、聪明、强壮、光泽均为十进制整数 0–255，
空值或小数草稿不能应用。英文按当前格式区分 Gen3–5 的 Smart 与 Gen6+ 的 Clever，中文/日文沿用上游用词。
支持全部 255、全部 0 和还原草稿；只有可写接口才开放输入，应用只改变实际变动项。

极限特训依据 StatEditor.ClickIV 的 Shift 分支、LoadHyperTraining 与 IHyperTrain 的六个布尔属性。
界面固定使用 HP/攻击/防御/特攻/特防/速度，明确映射到对应属性，避免误用核心 HP/攻击/防御/速度/特攻/特防索引。
支持逐项标记、全部标记和全部清除；沿用桌面手动编辑，不自行加上等级或原始 IV 资格拦截，也不宣称合法。
保留原始个体值和未使用标记位。应用到队伍时通过核心重算能力值，保留异常状态，当前 HP 仅在超过新上限时下调；
盒子不写入额外队伍状态，单独修改华丽大赛数值不触发能力值重算。

编辑进入可撤销工作副本，保留其他格位与原文件。输入与实体接口校验在核心执行，返回后核对完整载荷。
华丽大赛 11 种存档及极限特训 SN、US、BD 三种存档的队伍/盒子往返通过，
覆盖单项标记、全部设置/清除、特攻与速度顺序、原始 IV、未使用标记位、完整载荷、健康状态、其他格位及原文件保持。
另核对 15 种实体的接口能力和边界，极限特训支持实体补查特攻/速度映射；不以实体检查代替对应存档验收。
原生套件、186 文件 / 648 前端测试、类型、变更文件 lint、核心与前端构建通过，保留既有构建警告。
浏览器仍待新版核验，已请求所有者指定线上 UI 检查地址，不将工程结果视为所有者验收。

## 基础编辑的数据保持修正（API 28）

修正 PokemonEditing.Apply 的两处隐式副作用：无条件设置 PKM.CurrentLevel 会把经验重置到等级起点，
无条件 ResetPartyStats 会恢复血量并清除异常状态。依据 PKM.CurrentLevel、LoadStats、ResetPartyStats 的实际行为，
未改变等级和经验成长曲线时保留完整 EXP；变更等级或更换不同成长曲线的种类时才重新设置目标等级经验。
原训练家姓名相同则不调用字符串写入器，保留名称结束符后的原始字节。

队伍比较修改前后的核心计算能力值；只有目标等级或计算能力值实际变化时重算，
保留原异常状态，当前血量取原值与新上限的较小者，濒死状态保持为 0。
昵称、亲密度、招式等不影响计算能力值的修改保留已有队伍状态；盒子编辑不额外初始化队伍状态。
保持校验、完整目标载荷重读验证、撤销和原文件保留流程。编辑字段不变，握手版本提升为 API 28，
避免更新后的前端继续接受带有旧副作用的缓存核心。
E、D、Pt、HG、B、B2、X、OR、SN、US、BD 共 11 种存档的受伤/濒死场景与原生套件通过。
队伍和盒子覆盖昵称、亲密度、招式、个体值、等级及同/异成长曲线种类变更，
核对经验、名称字节、健康状态、完整目标载荷、其他格位和原文件保持；刻意保留非标准缓存能力值验证无关修改不会重算。
类型、变更文件 lint、5 项前端领域测试、核心与网页构建通过，保留既有构建警告。
线上 UI 地址仍待所有者提供，不将工程检查作为所有者验收。

## 背包读取（API 29）

存档面板新增“背包”分页，按需读取当前工作副本。展示每个口袋的全部原始格位、道具编号与三语名称、
数量和逐道具上限；名称来自 GetItemStrings(save.Context, save.Version)，不套用现代游戏编号。
口袋/数量规则依据 SAV_Inventory、SaveFile.Inventory、PlayerBag.GetMaxCount、InventoryPouch.GetAllItems/CanContain。
数量为核心返回的十进制整数，本批无写入输入。格位保留核心返回顺序，界面以 1 起始显示。

按实际接口读取收藏、新获得、自由空间、自由空间顺序、商店新品和已携带标记；不支持的字段为 null。
支持当前语言名称或编号搜索、显示空格位与每页 50 行，表格自身滚动；空背包、无匹配和未提供背包有独立状态。
未识别编号使用 #编号 显示，超出常规口袋/数量范围提示但不清理，也不把口袋允许存放等同于合法性证明。
读取不调用上游窗口的 Sanitize、排序、ClearCount0 或 CopyTo，不改变工作副本、原文件和撤销记录。
重新打开存档、应用修改、撤销或还原后使旧背包报告失效；只读格式仍可读取核心提供的背包。

本批是背包读取入口，编辑、排序、批量给予/清空与道具图片仍待接入，SAV_Inventory 不标为完成。
E、D、Pt、HG、B、B2、X、OR、SN、US、BD 的口袋/格位/数量上限、三语名称与接口标记读取检查通过，
另验证未知编号 65535 和超限数量保持。原生套件、648 前端测试、类型、变更文件 lint、核心与网页构建通过。
保留既有裁剪与构建警告，浏览器待核验。检查覆盖上述 11 种存档，不据此宣称其他格式已验收。

## 单格背包编辑（API 30）

选择背包道具后显示编辑草稿，种类选项来自该口袋 GetAllItems 与空项，数量上限逐项调用 PlayerBag.GetMaxCount。
可修改种类、数量以及当前实体支持的收藏/新获得/自由空间标记与顺序；不支持的标记不显示。
应用进入工作副本与现有撤销流程，清空只先修改草稿；切换格位会放弃该格位未应用草稿。
原文件保持。只读存档可查看但不能应用。排序、批量给予/清空及道具图片仍待接入。

输入依据为 SAV_Inventory.SetBag/Dgv_CellValueChanged 与 PlayerBag.IsQuantitySane：
口袋/格位均为核心返回范围内的零起始整数；界面位置显示从 1 起始。
种类限该口袋目录，0 表示空格；数量十进制整数 0 至逐道具上限，空格只能为 0，
没有 IItemNewFlag 的非空道具数量必须大于 0。空白、小数与负数草稿不允许应用，核心同时复核。
没有 IItemNewFlag 的格式清空非空格位时，后续格位前移并在末尾补空，保持顺序；不额外清理原有其他空位。
IItemFreeSpaceIndex 在可写格式中为 InventoryItem7 的 10 位字段，限制 0–1023；布尔标记不允许传给不支持的实体。
BDSP 以道具编号索引记录，拒绝把格位换成另一个已有编号，避免覆盖其独立数据。

写回使用上游 CopyTo 的编码，比较未编辑与已编辑的核心编码差异，仅合入变化位，保留原始数据的其他位。
原始存储区按 PlayerBag*.CopyTo 对应的 LargeBlock.Inventory、General、Items.Data 或 GC Data 选取，不自行复制编码算法。
这排除整包写入附带的相同清理、重排和保留位归零。合入后重新读取完整背包并与核心期望核对，
导出后再核对类型、校验与背包报告；无法保持的存档拒绝返回输出，不静默丢失数据。
E、D、Pt、HG、B、B2、X、OR、SN、US、BD 的种类/数量/清空完整输出比较、支持标记连续设置与清除、
输入边界、原文件保持通过；无新道具标记格式的中间格位清空顺序与第七世代已编辑/未编辑格位保留位保持通过。
原生套件、648 前端测试、类型、变更文件 lint、核心与网页构建通过，保留既有构建警告。
浏览器待核验；上述工程证据不代表其他格式或所有者验收。

## 口袋排序与批量操作（API 31）

背包新增折叠的“整理当前口袋”，提供名称、数量、序号的正向/反向排序，以及统一数量、获得全部与清空。
全部针对当前工作副本的当前口袋，不自动应用单格草稿，应用后进入现有撤销与副本导出流程。
名称目录使用当前界面语言 zh-Hans/en/ja，排序委托 Core.SortByName，保留核心运行环境的字符串比较规则。
六种排序、ModifyAllCount、GiveAllItems 和 RemoveAll 均直接使用上游方法，不在前端复制逻辑。

输入依据为 SAV_Inventory.cs 的 SortBy*/GiveAllItems/GetModifySettings/ModifyAllItems/ChangeViewedPouch，
Designer.cs 的 NUD_Count.Minimum=1，以及 InventoryPouch 与 PlayerBag 的数量规则。
批量数量是 1 至口袋 MaxCount 的十进制整数，随后由核心按每种道具 GetMaxCount 截取；
空白、小数、0、负数和超限值不能应用，排序/清空请求不接受数量字段。
PCItems/FreeSpace 的数量与获得全部沿用普通模式限制（上游 SAV8LA 例外），不提供 HaX 绕过；
只读格式仍不能写入。清空与排序保持可用。

获得全部使用 GetAllItems 的目录、IsLegal 过滤与指定数量，会替换当前口袋内容和标记。
IsCramped 为真时明确提供目录顺序或随机选择；随机只打乱目录，再由核心填入可容纳的道具。
不承诺每次随机都不同，也不把道具目录允许获得等同于整个存档的合法性证明。
容量不足提示与替换/清空说明在操作旁显示，其他口袋保持不变。

单格和批量共用核心编码差异合入与完整背包核对；不执行桌面表格读取时的隐式清理，
不因整理一个口袋而整理其他口袋。
E、D、Pt、HG、B、B2、X、OR、SN、US、BD 共 11 种存档的六种排序、三语名称排序、统一数量、获得全部与清空通过完整输出比较。
容量不足时验证随机结果的目录范围、唯一性、填充数量与完整输出；另验证非法请求、PC 数量限制及第七世代保留位保持。
另验证秘传学习器等道具在统一数量时使用低于口袋上限的独立上限，并比较完整输出。
原生套件、648 前端测试、类型、变更文件 lint、核心与网页构建通过，保留既有构建警告。
浏览器待核验；工程证据不代替所有者验收。道具图片和 HaX 模式仍待接入。

## 背包道具图片（API 32）

背包列表与单格编辑草稿加入本地道具图片，沿用三语名称、编号和原有字号，不以图片替代文字。
统一使用 PKHeX 经典 bitem 图像，固定 32×32 容器、按需加载；空格不显示图片，未收录编号显示上游未知道具图。
选择道具时草稿图片同步更新，清空时移除。图片不参与存档写入。

依据为 SAV_Inventory.UpdateSprite、SpriteBuilder.GetItemSprite、SpriteBuilder5668.GetItemResourceName。
编号由 Core.ItemConverter.GetItemDisplay 按存档 Context 转换，再由 HeldItemLumpUtil 选择 TM/TR；
不把第二/第三世代原始编号直接当作现代图像编号。异常负数、超出 ushort 或旧一/二世代超出 byte 范围的编号显示未知图，避免截断配错图。
不改变输入控件范围与上游核心。接口添加格位及选项 Sprite，握手提升为 API 32。

606 张 PNG 共 303,893 字节，按上游 Resources.resx 引用原样复制，记录来源路径及 SHA-256；无运行时 CDN。
导入脚本为 scripts/import-pkhex-item-art.mjs，传入所有者提供的 PKHeX 26.08.26 源码目录即可重建该批图像与清单。
旧世代编号转换、TM/TR、异常编号回退、11 种存档的格位/目录图像序列化及原生套件通过。
606 张图片原始哈希检查、7 项前端测试、类型、变更文件 lint、核心与网页构建通过，保留既有构建警告。
已授权 localhost Chrome 本轮刷新后仍加载旧 index-BbDn0w3C.js，不能作为新版 UI 证据；工程检查不代替所有者验收。

## 背包高级编辑（API 33）

背包增加默认关闭的“高级编辑（HaX）”，切换后使用当前 Context/Version 的完整道具名称目录，
包括不属于所选口袋的道具与未命名编号；保留三语名称、图片和编号，未知名称用 #编号。
只读格式仍不能应用。切换模式会重置未应用的单格和批量草稿；工作副本、撤销、原文件保持规则不变。

输入依据为 SAV_Inventory.GetDGV/GetBag/SetBag/ChangeViewedPouch 和 PlayerBag.IsQuantitySane：
单格编号为当前名称目录的 0 至 Length−1，十进制整数；高级数量为 0 至 PlayerBag.MaxQuantityHaX，
GB 为 255、其他为 65535，前端最多五位，空白/小数/负数拒绝。常规模式仍使用口袋与逐道具上限。
高级模式允许非空道具数量为 0。没有 IItemNewFlag 的格式仍把编号 0 作为移除格位，忽略其数量并前移后续格位，
对应上游 SetBag 的空项压缩；不附带清理其他格位。
自由空间顺序与布尔接口限制不变。PCItems/FreeSpace 的批量数量与给予入口在高级模式开放，
批量数量仍为 1 至口袋 MaxCount；GiveAllItems 仍取常规口袋目录并做 IsLegal 过滤，ModifyAllCount 仍逐道具截取。

SAV_Inventory 的高级输入上限不保证对应格式能存储该值：InventoryItem7 的数量实际为 10 位，
InventoryItem8.GetValue 也把数量限制为 10 位，InventoryPouch8b.SetPouch 跳过其他口袋道具。
适配层保留高级输入范围，但在写入后再次比较请求的编号与数量；出现截断、丢弃或错位则拒绝输出，原文件保持。
BDSP 原有重复编号保护继续生效；不提供绕过物理存储和完整回读检查的路径。

11 种存档的高级目录、0/超常数量、错口袋行为、无法表达的请求拒绝与完整输出比较及原生套件通过。
另验证高级 PC 批量入口与普通模式继续拒绝高级请求；补充空白项数量差异及 BDSP 清空后重排场景通过。
7 项前端测试、类型、变更文件 lint、最终核心与网页构建通过，保留既有裁剪与文件体积警告。
构建后刷新 localhost Chrome 仍加载旧 index-BbDn0w3C.js，不能核验新版界面；完整目标保持，工程证据不代替所有者验收。

## 训练家性别、时间与工作副本（API 34）

训练家面板增加性别、游戏小时/分钟/秒及“应用训练家修改”。应用后更新工作副本、摘要与资料联动，进入既有撤销历史。
导出仍支持叠加尚未应用的训练家草稿。撤销时已应用字段跟随存档回退，独立未应用草稿保持；还原原文件则重置全部草稿。
姓名没有变化时不再调用字符串写入，保留尾部原始字节；其他未改字段也不主动重写。

性别选项为 0/1，对应上游 CB_Gender 的男性/女性两项。第一世代不显示该控件，只读存档仍不能应用。
小时十进制 0–65535、最多五位，对应 Mask=00000 与 ushort.Parse；分钟/秒为 0–99、最多两位，
对应 Mask=00，写入时按上游对 60 取余，界面明确说明。空白、负数、小数和越界请求拒绝。
未修改的异常原值不发送补丁，因此修改其他字段不会顺带归一化时间或性别。
GC 存档时间沿用 SAV_SimpleTrainer 隐藏 Adventure 编辑区的边界，仍在摘要只读显示。

输入依据：SAV_SimpleTrainer、Gen6/SAV_Trainer、Gen7/SAV_Trainer7、Gen8/SAV_Trainer8/8b 的代码与 Designer；
存储依据：SaveBlock3SmallRS/E/FRLG、SAV4、PlayerData5 与 PlayTime<TSave> 的 ushort 小时和 byte 分钟/秒。
剑／盾更改性别遵循 SAV_Trainer8.CB_Gender_SelectedIndexChanged/ResetAppearance：
使用当前肤色组与新性别调用 MyStatus.ResetAppearance，重置穿着及外观，界面提前说明且支持撤销。
性别未变不重置外观；无法识别肤色时拒绝修改。其他格式不附带同步外观操作。
导出回读核对完整训练家快照；剑／盾另核对 MyStatus 全部字节。

E、D、Pt、HG、B、B2、X、OR、SN、US、BD 的性别、时间边界/取余、未改异常值与完整输出比较通过。
GBA/第四世代另植入姓名尾部字节验证保持；所有请求均验证原输入不变和校验有效。
剑／盾只完成 Core 创建对象上的外观重置、未改外观保持与未知肤色拒绝检查，不代表真实存档往返验收。
前端草稿校验与撤销草稿同步等共 9 项测试、原生套件、变更文件 lint、最终类型、核心与网页构建通过。
保留既有裁剪与文件体积警告；浏览器待核验，工程检查不代替所有者验收。
语言、地区、徽章、地图及各世代专有训练家字段继续按完整清单推进。

## 训练家存档语言（API 35）

训练家面板按存档版本显示语言选择，与应用界面语言独立；选项名称使用 PKHeX 的中、英、日文本。
应用进入工作副本、撤销和导出流程，不批量修改已有宝可梦的名称或语言。
当前开放 XY、ORAS、SM、USUM、剑／盾和 BDSP；旧世代简单训练家窗口不新增语言编辑，其他格式继续按完整清单推进。

选项依据为 Gen6/SAV_Trainer、Gen7/SAV_Trainer7、Gen8/SAV_Trainer8/8b 的 CB_Language 与
Core GameDataSource.LanguageDataSource。第六世代 ID 为 1、2、3、4、5、7、8；第七/八世代另含 9、10。
界面为固定下拉项，空白、小数及不在当前目录的请求拒绝；未改变的未列出原值保持，不强制归一化。
标签取 GameInfo.GetStrings(language).languageNames，不更改全局应用语言。

存储依据为 MyStatus6.Language（0x2D 字节）、MyStatus7.Language（0x35 字节）、
MyStatus8.Language（0xA7 字节）及 ConfigSave8b.Language（配置块偏移 4 的 int32）。
剑／盾沿用 Core setter 同步 KGameLanguage：编号大于等于 6 时减 1，未改语言不调用 setter。
导出回读同时核对训练家语言、剑／盾完整 MyStatus 与运行时语言值。
同时改变姓名时先设置目标语言再编码新姓名；姓名未变时保留全部原始名称字节，包括尾部数据。

X、OR、SN、US、BD 覆盖每个支持语言、日/韩/中文姓名、完整输出比较、原输入与尾部字节保持及无效请求。
剑／盾测试仅使用 Core 创建对象，并显式初始化空模板运行时语言块类型；不代表真实存档往返验收。
上述检查与原生套件、10 项前端测试、类型、变更文件 lint、核心及网页构建通过。
保留既有裁剪与文件体积警告；浏览器仍待核验，工程证据不代替所有者验收。

## 训练家国家、地区与 3DS 区域（API 36）

XY、ORAS、SM、USUM 的训练家面板增加国家、地区及 3DS 区域下拉项，复用本地三语地名目录。
对应上游 Gen6/SAV_Trainer、Gen7/SAV_Trainer7 的 CB_Country、CB_Region、CB_3DSReg；
国家及地区取 Util.GetCountryRegionList 的 countries / sr_NNN，主机区域取 GameDataSource.Regions 和 Locale3DS.DefinedLocales。
所有值为 byte，范围 0–255；主机区域仅提供 0、1、2、4、5、6，国家与地区必须属于对应目录。
空白、小数、越界及其他国家的地区请求拒绝；未改的异常原值以 #编号显示并保留。

切换非零国家时沿用 Main.SetCountrySubRegion 的索引规则：旧索引大于 0 且未超出新列表则保持，否则选第一项。
共享目录保持既有中文目录顺序，名称按应用语言切换；不把不同语言排序后的行号当作地区编号。
国家为 0 时沿用上游不改写地区的行为，页面暂时禁用地区选择，不自动清零原值。
主机区域独立编辑，不自动修正国家、地区、语言或已有宝可梦的产地与居住记录。

存储依据：MyStatus6 的 Region/Country/ConsoleRegion 为 0x26/0x27/0x2C 字节，
MyStatus7 对应 0x2E/0x2F/0x34。适配层只调用变更字段的 IRegionOrigin setter；导出回读加入三项快照。
应用、导出、撤销及还原继续使用既有流程；撤销遇到独立未应用的国家或地区草稿时保留整组，避免跨国家错配。
其他格式不开放这组编辑；训练家其他字段与专有窗口继续按完整清单推进。

X、OR、SN、US 的全部国家/地区目录及三语名称、主机区域、代表地区完整输出、回读校验、无效请求与异常原值保持通过。
旧格式请求拒绝、原生套件、11 项前端测试、类型、变更文件 lint、核心及网页构建通过。
保留既有裁剪与文件体积警告；浏览器仍待核验，工程检查不代替所有者验收。

## 训练家徽章（API 37）

GBA、第四/第五世代、XY/ORAS 与 BDSP 的训练家面板增加逐枚徽章勾选，使用三语名称与自适应网格。
普通格式 8 项，HGSS 16 项；勾选进入训练家草稿，应用、撤销、还原与导出均沿用既有流程。
来源为 SAV_SimpleTrainer 的 cba / CHK_H1–8、Gen6/SAV_Trainer 的 CHK_Badge1–8，
以及 Gen8/SAV_Trainer8b 的 CHK_Badge1–8。GC、第七世代与剑／盾不显示这组逐枚控件。
界面说明不自动完成道馆剧情或解锁地图，避免把徽章标记等同于完整事件进度。

输入为布尔复选框，接口使用整数组合值：8 项为 0–255，16 项为 0–65535；空白、负数、小数、越界及不支持格式拒绝。
GBA 调用 SAV3.Badges，沿 LargeBlock.BadgeFlagStart 修改连续 8 个事件位：RS 为 0x807、E 为 0x867、FRLG 为 0x820。
第四世代为 Trainer1+0x1A 的 byte，HGSS 另含 Trainer1+0x1F 的 byte，界面 9–16 项对应这第二组。
第五世代 Misc5 为偏移 0x4 的 byte，XY/ORAS Misc6 为偏移 0xC 的 byte。
BDSP 沿 SAV_Trainer8b 对应 FlagWork8b 系统标记 124–131，每项位于 OFS_SYSTEM+index×4，保存为 0/1 的 int32。
适配层仅重写改变的 BDSP 项，未改异常标记值保持；其他存档也不在草稿未变时重写徽章。
导出回读快照包含徽章数量与组合值，并核对校验。

E、D、Pt、HG、B、B2、X、OR、BD 的逐枚/全部/清空、完整输出、范围拒绝、原文件与校验保持通过。
另验证 BDSP 未改异常系统标记保持，以及不支持格式拒绝；原生套件、12 项前端测试、类型、变更文件 lint、核心与网页构建通过。
保留既有裁剪与文件体积警告；浏览器仍待核验，其他进度和完整 PKHeX 清单继续推进。

## 训练家 BP、里程、圆庆币与瓦特（API 38）

第五至第八世代已开放格式按实际能力显示 BP、宝可里程、圆庆币或瓦特，沿用训练家草稿、应用、撤销及导出。
界面使用十进制数字文本框并显示上限；BP 为 0–9999、最多四位，其余为 0–9999999、最多七位。
空白、负数、小数、越界及不支持字段拒绝。未改的超范围或异常原值不发补丁，修改其他训练家字段时保持。

输入来源：SAV_SimpleTrainer 的 MT_Coins 在第五世代重标为 BP，按 SaveFile.MaxCoins=9999 限制；
Gen6/SAV_Trainer 的 TB_BP.Mask=0000、TB_PM.Mask=0000000；
Gen7/SAV_Trainer7 的 NUD_BP.Maximum=9999、NUD_FC.Maximum=9999999；
Gen8/SAV_Trainer8 的 NUD_BP、MT_Watt.Mask=0000000 与 MyStatus8.MaxWatt；SAV_Trainer8b 的 NUD_BP.Maximum=9999。
未把旧世代其他窗口的代币编辑混入此训练家字段组，相关窗口继续按完整清单接入。

存储与联动沿用上游：第五世代 BattleSubway5.BP 为偏移 0 的 ushort；第六世代 BP 使用 SAV6.BP。
宝可里程同时设置记录 63（当前）和 64（累计），遵循 SAV_Trainer 保存流程，即使降低当前余额也把累计设为同值。
第七世代 Misc7.BP 为偏移 0x11C 的 uint；JoinFesta7.FestaCoins 为 0x508 的 int32，
setter 按记录 38 的已使用量加新余额重算 0x50C 的累计值，并截取至 9999999。
剑／盾 Misc8.BP 为 0x11C 的 ushort，MyStatus8.Watt 为 0xD0 的 uint；
新余额高于记录 22（Record8.WattTotal）时提高累计，否则保留累计值。BDSP BattleTowerWork8b.BP 为 0xC 的 uint。
仅在对应余额发生变化时调用 setter；界面提前说明累计记录联动，导出回读同时检查这些关联值。

B、B2、X、OR、SN、US、BD 的边界、累计联动、同值不重写、完整输出、原文件与校验保持通过。
剑／盾 Core 创建对象的余额与累计记录完整块比较、其他格式拒绝及原生套件通过，不代表剑／盾真实存档往返验收。
13 项前端测试、类型、变更文件 lint、核心与网页构建通过，保留既有裁剪与文件体积警告；浏览器仍待核验。

## 游戏记录编辑（API 39）

存档面板增加“游戏记录”页，覆盖 XY/ORAS 与 SM/USUM 各 200 项、剑／盾 50 项、BDSP 30 项。
来源为 TrainerStat.LoadRecords/ChangeStat/ChangeStatVal 与各训练家窗口的 LoadRecords 调用，
使用 RecordLists.RecordList_6/7/8、Record8b.RecordList_8b；缺少名称时保留上游三位编号。
界面操作文案及记录名称支持三语；项目词表按上游完整字符串匹配，避免跨游戏相同编号错配。
第六/七世代英文保留原名，第八世代内部代号提供可读名称，详情始终保留上游原名。
含义未确认的代号明确标注，未命名项使用本地化编号，未来新增而未覆盖的名称回退原文。
共享 Select 支持按名称或编号选择，记录区偏移放在可展开详情；第六/七世代编号 2 按 DateUtil 提供时间说明。
负数原值只展示并保持，跳过无法构造 TimeOnly 的解释，不在读取时重写数据。

输入依据：NUD_Stat 默认最小值 0，最大值为 Math.Max(当前读值, GetRecordMax(index))，无小数。
接口同为非负 int32，输入最大长度按动态最大值的十进制位数生成；空白、小数、负数、越界与无效编号拒绝。
修改超限原值时沿 Core.SetRecord 截取到正常上限，并在界面提前说明；未改值不调用 setter。
第六/七世代 RecordBlock6 的前 100 项为 int32 读取、后 100 项为 int16 读取/ushort 写入。
部分后段记录的声明上限无法以该读取类型回读，适配层拒绝这样的请求，不输出被截断或变成负数的修改。
BDSP 仅读写 Record8b 对外开放的首组 30 项，其余 11 组原字节保持；不因 Getter 的显示截取而清理隐藏超限原值。

读取独立按需运行于 Worker；编辑进入工作副本、撤销与还原，回读核对整个记录区及校验。
修改记录后重新加载列表并保留所选编号，训练家摘要与余额草稿按工作副本重新同步，独立未应用草稿保持。
切换至不支持记录页的存档时返回训练家页；不把 ITrainerStatRecord 之外的世代专有记录混入本页。
X、OR、SN、US 各 200 项和 BDSP 30 项逐项完整输出、名称/偏移、上限及原文件/校验保持通过。
另验证负数记录、超限值截取、BDSP 隐藏原值与 12 组记录区保持，剑／盾 50 项仅完成 Core 对象检查。
原生套件、14 项前端测试、最终类型、变更文件 lint、核心与网页构建通过，保留既有构建警告。
记录词表测试直接核对随项目分发的第六至第八世代 Core 目录，检查全部具名项覆盖及未知项回退。
词表包含剑／盾 DLC 的源名称，但不改变已开放的 50 项记录范围；不修改存档接口或输入边界。
浏览器仍待核验，工程证据不代替所有者验收，完整 PKHeX 目标保持。

## GBA 游戏设置（API 40）

训练家页增加可折叠的“游戏设置”，覆盖 SAV3RS、SAV3E、SAV3FRLG 的文字速度、战斗方式、声音和战斗动画。
与训练家草稿一起应用、撤销和还原，切换存档时重新载入；非 GBA 格式不显示、不接受这组修改。
依据 `PKHeX.WinForms/Subforms/Save Editors/SAV_SimpleTrainer.cs` 的 SAV3 初始化与 B_Save_Click，
以及 Core `Saves/Blocks/Gen3/SaveBlock3SmallRS.cs`、`SaveBlock3SmallE.cs`、`SaveBlock3SmallFRLG.cs`。

上游文字速度目录为 0（慢）、1（中）、2（快）、3–7；战斗方式和声音各两项，战斗动画为布尔值。
接口使用可空整数，省略即保持原值；空白、负数、小数、目录外值和不支持格式拒绝。
三个 SmallBlock 的 OptionsConfig 位于 0x14，文字速度读取低三位、setter 只写低两位；
因此未改的 4–7 保持，新的 4–7 请求明确拒绝，允许显式改为 0–3，不静默截断。
声音对应位 8（0 单声道/1 立体声）、战斗方式位 9（0 切换/1 连战），
战斗动画对应位 10 的反值（OptionBattleScene=true 表示关闭）。只调用实际变动字段的 setter。
不修改按钮方式、窗口样式、地图缩放和其余保留位；导出回读比较四项设置及现有训练家快照。

验证覆盖三种格式的 32 种可写组合、完整输出与独立 Core setter 对比、异常速度保持和拒绝、
来源文件保持、校验及其他格式拒绝。RS/FRLG 使用合成扇区存档，E 使用既有工程夹具；不代表所有者实档验收。
最终原生套件、18 项前端测试、变更文件 lint、类型、核心与网页构建通过，保留既有构建警告。
本地 Chrome 刷新仍加载旧页面，新界面未完成浏览器核验，不代替所有者验收。

## DS 训练家国家与地区（API 41）

训练家国家/地区扩展至 DP、Pt、HGSS、BW、B2W2，沿用三语选择、草稿、撤销与导出回读。
来源为 `SAV_SimpleTrainer.cs` 的 SAV4/SAV5 初始化、UpdateCountry 和 B_Save_Click，
以及 `Main.SetCountrySubRegion`、Core `Util.GetCountryRegionList`。
按世代使用 `gen4_countries`/`gen5_countries` 与 `gen4_sr_*`/`gen5_sr_*`，
无专用地区资源时使用对应 `sr_default`（仅编号 0），不套用 3DS 的国家编号或地区目录。
中文、英文、日文名称按同一编号配对，目录排列沿用上游中文列表；切换国家尽量保留之前选项的位置，
超出新目录时选择第一项。DS 的国家 0 也重建默认地区；第六/七世代继续保留国家 0 下的原地区。

存储为两个 byte：第四世代 General[Geonet+1/+2]，DP Geonet=0x96D8、Pt=0xA4C4、HGSS=0x8D44；
第五世代 PlayerData5 的 0x1C/0x1D。接口限制 0–255，发生修改时验证世代国家/地区配对；
无效编号、空白、小数、负数、越界均拒绝，未改的未知国家或异常地区保持原字节。
不联动改写地球仪访问标记或其他训练家字段。DS 无主机区域，报告返回 null 与空目录，界面隐藏该项并拒绝写入请求。

验证范围包括五种存档的全部目录/三语名称、每个有效配对可写性、每个国家首尾地区完整输出、
默认目录、无效配对/主机区域拒绝、未知原值保持和原文件/校验保持。
上述五种存档检查、原生套件、19 项前端测试、变更文件 lint、类型、核心与网页构建通过，保留既有构建警告。
本地浏览器待核验，工程证据不代替所有者验收，完整 PKHeX 目标继续推进。

## DS 训练家地图与坐标（API 42）

训练家页增加“地图与坐标”折叠区，覆盖 DP、Pt、HGSS、BW、B2W2 的地图编号及 X/Z/Y。
来源为 `SAV_SimpleTrainer.cs` 的位置读取、MapUpdated/B_Save_Click 与 `SAV_SimpleTrainer.Designer.cs` 的 NUD_M/X/Z/Y：
十进制整数，地图 0–1000，X/Y 0–65535，Z -65535–65535，无小数；空白、指数形式和越界输入拒绝。
省略字段即保持，未改的异常原地图值也保持。草稿、应用、撤销和还原沿用训练家流程；
撤销时若任一位置草稿尚未应用，保留整组地图和坐标，避免与另一张地图错配。

第四世代主坐标偏移：DP 的 M/X/Y 为 General 0x1238/0x1240/0x1244，
Pt 为 0x1280/0x1288/0x128C，HGSS 为 0x1234/0x123C/0x1240，均读写 ushort。
X/Y setter 同时写入 X2/Y2：DP 0x25FA/0x25FE、Pt 0x287E/0x2882、HGSS 0x236E/0x2372；
Z 位于 DP 0x2602、Pt 0x2886、HGSS 0x2376。仅实际变动的 X/Y 调用 setter，
不因修改地图或 Z 而重写未改的关联坐标；导出快照同时核对 X2/Y2。

第五世代使用 PlayerPosition5 的 M/X/Z/Y：0x80/0x86/0x8A/0x8E。
M getter 读取 int32，setter 只写低 ushort；高位异常时原值保持，无法完整回读的新地图请求拒绝，
不擅自清理高位。其他坐标只修改对应 ushort，保留相邻位置数据。
所有上述 Z getter 均读 ushort，setter 将有符号输入转为 ushort；负值按上游规则模 65536 保存，
例如 -1 → 65535、-65535 → 1。界面在应用前显示转换结果，导出回读核对转换后的值。

检查范围为五种存档的边界、负 Z 编码、第四世代关联坐标、完整输出、异常地图保持/拒绝、原文件和校验保持。
上述五种存档检查、原生套件、20 项前端测试、变更文件 lint、类型、核心与网页构建通过，保留既有构建警告。
其他位置布局不套用 DS 字段；第六至第八世代位置在 API 45 接入。浏览器待核验，不代替所有者验收。

## 冒险开始与名人堂日期（API 43）

训练家页增加“冒险日期”折叠区，覆盖 DP、Pt、HGSS、BW、B2W2、XY、ORAS、SM、USUM。
两项日期精确到秒，按游戏内时钟显示和保存，不根据浏览器时区换算；沿用三语、草稿、应用、撤销及导出回读。
来源为上游 `SAV_SimpleTrainer.cs/.Designer.cs`、`Gen6/SAV_Trainer.cs/.Designer.cs`、
`Gen7/SAV_Trainer7.cs/.Designer.cs` 的日期和时间控件，以及 Core `DateUtil`、`SAV4`、
`AdventureInfo5`、`GameTime6`、`GameTime7`。

第四/第五世代日历上限 2099-12-31，第六/第七世代上限 2050-12-31；分别组合日期及时间的全天范围。
最小可写值为 2000-01-01 00:00:00：DS 名人堂日期控件未显式设置 MinDate，
但 unsigned epoch 无法表示 2000 年之前，因此接口拒绝负秒数而不复现回绕。
其余日期和时间控件的显式最小值为 2000 年。接口使用固定 `yyyy-MM-ddTHH:mm:ss`，
省略字段即保持；空白、无效闰日、24 时、60 分/秒、小数秒、时区后缀和越界新值拒绝。
浏览器省略零秒时补为 :00，不改变对应日期；不额外限制开始日期与名人堂日期的先后关系。
未修改的超出日历范围原值仍保留，允许明确修正，不因其他训练家字段变化而归一化。

第四世代 General 的 AdventureInfo+0x34/0x3C 为两个 uint；
第五世代 AdventureInfo5 的 0x34/0x3C 为两个 ulong，而 SaveFile 属性只暴露低 uint。
只对实际改动日期调用 setter，保留另一个日期全部 64 位；明确改动时按 Core setter 写入新 uint。
第六世代 GameTime6 的 0x18/0x20、第七世代 GameTime7 的 0x28/0x30 为 uint，
相邻恢复时间与阿罗拉时间不修改。使用 long ticks 计算后检查转 uint，避免 DateUtil 的 int 中间值
在 DS 的 2068 年之后溢出。训练家导出快照同时核对两个完整原始值。

工程检查覆盖九种存档的日历边界、闰日、秒精度、2068 年之后日期、完整输出与 Core setter 对比、
第五世代高位保持、异常原日期保持/修正、输入文件和校验保持。最近保存时间以及剑盾、BDSP 的日期
在下一批 API 44 接入，不把日期功能视为训练家窗口或整个 PKHeX 已完成。
九种存档日期检查、原生套件、17 项前端测试、变更文件 lint、核心与网页构建通过，保留既有构建警告。
浏览器待核验，不代替所有者验收。

## 最近保存与第八世代日期（API 44）

训练家页将日期统一为“日期与时间”折叠区，按字段提供日期/分钟/秒/本地时间、范围及空白原值说明。
第四至第七世代开始与名人堂行为保持；XY、ORAS、SM、USUM 增加最近保存，剑盾增加开始和最近保存，
BDSP 增加开始和最近保存的本地时间。剑盾、BDSP 不提供不存在的名人堂日期；DS 不提供最近保存。
API 44 的 dates 改为带 key/value/min/max/kind 的数组，旧版 Worker 必须通过现有版本握手更新。

依据 `Gen6/SAV_Trainer.cs/.Designer.cs`、`Gen7/SAV_Trainer7.cs/.Designer.cs`、
`Gen8/SAV_Trainer8.cs/.Designer.cs`、`Gen8/SAV_Trainer8b.cs/.Designer.cs` 及相应 Core 类型：

| 格式/字段          | 存储与精度                                              | 新值范围                          |
| ------------------ | ------------------------------------------------------- | --------------------------------- |
| XY/ORAS 最近保存   | PlayTime6 的 0x04，Epoch0000DateTime，分钟              | 2000-01-01 至 2050-12-31          |
| SM/USUM 最近保存   | PlayTime6 的 0x04，Epoch0000DateTime，分钟              | 1753-01-01 至 2050-12-31          |
| 剑盾开始           | TrainerCard8 的 0x170 ushort 年、0x172/0x173 byte 月/日 | 2000-01-01 至 2060-12-31，仅日期  |
| 剑盾最近保存       | PlayTime7b 的 0x04，Epoch1900DateTimeValue，分钟        | 1900-01-01 至 4095-12-31          |
| BDSP 开始/最近保存 | SystemData8b 的 0x04/0x10，int64 FILETIME               | 本地 2000-01-01 至 2099-12-31，秒 |

分钟字段一天范围 00:00–23:59，新非零秒请求拒绝，不静默舍入；秒字段一天范围 00:00:00–23:59:59。
第七世代及剑盾最近保存的日期控件没有显式 MinDate，默认 1753 年；剑盾还受 1900 年存储起点限制。
分别组合日期与时间控件的值，不沿用桌面载入时因时间控件年份范围导致隐藏整个字段的行为。
Epoch0000 的低 12 位为绝对年，之后依次为月 4 位、日 5 位、时 5 位、分 6 位；
Epoch1900 的年相对 1900、月从 0 起。只改对应 4 字节，保留游玩时间和相邻内容。

BDSP 由浏览器将 UTC 值换算为本地时间，修改时发送明确的 ±HH:mm 偏移，核心不依赖 Wasm 的本地时区。
校验选择的本地日期范围，再转 UTC；保留原 FILETIME 小数秒，与上游 ReviseTimestamp 一致。
开始/最近保存之外的计数器、惩罚、每日时间和时钟快照保持；相同瞬间的不同偏移请求不重写。
夏令时跳时造成的不存在时刻拒绝；重复时刻的新选择按浏览器规则，未改值保留原瞬间并显示其原偏移。

空白或非法年月日/时分、非法 FILETIME 安全显示为空，不妨碍读取整个存档。
留空未改时保留全部原始字节；明确填写合法日期可修复，非法 FILETIME 修复采用零小数秒。
未修改的有效但超出界面范围的原日期保持；不支持格式/字段、清空有效日期和不符合精度的新值拒绝。
接口先校验整组请求再写入，回读核对请求值；导出快照覆盖原日期、完整 packed 时间、剑盾开始日期及 BDSP 两个时间记录。

检查覆盖四种第六/七世代工程存档的完整输出、分钟范围和坏值修复，剑盾 Core 对象的精确字节范围，
BDSP 完整导出、正负时区边界、小数秒及坏值保持。剑盾仍缺真实序列化存档夹具，不宣称实档往返已验证。
前端检查使用独立进程的实际时区覆盖 UTC、上海、纽约夏令时、加德满都及基里蒂马蒂。
最终原生套件、21 项前端测试、变更文件 lint、全量类型检查、核心与网页构建通过，保留既有构建警告。
浏览器待核验；完整 PKHeX 目标继续推进。

## 第六至第八世代地图位置（API 45）

训练家“地图与坐标”扩展至 XY、ORAS、SM、USUM、剑盾、BDSP，覆盖地图、X/Z/Y、旋转及剑盾三轴缩放。
沿用三语、工作副本、撤销及回读；未应用的位置草稿按地图/坐标/旋转/缩放整组保留，避免撤销后错配。
DS 的既有整数位置协议保持，新增 spatialPosition 提供字符串值、范围、小数位和整数截断信息。
字符串贯穿 Worker 和 Core，剑盾 uint64 地图编号不经过 JavaScript Number。

来源为上游 `Gen6/SAV_Trainer.cs/.Designer.cs`、`Gen7/SAV_Trainer7.cs/.Designer.cs`、
`Gen8/SAV_Trainer8.cs/.Designer.cs`、`Gen8/SAV_Trainer8b.cs/.Designer.cs` 的 NUD_M/X/Z/Y/R/SX/SZ/SY、MapUpdated 和保存逻辑。

| 格式    | 地图                        | X/Z/Y                                   | 旋转                | 缩放                     |
| ------- | --------------------------- | --------------------------------------- | ------------------- | ------------------------ |
| XY/ORAS | 0–1000 整数                 | X/Y 0–65535，Z -65535–65535，6 位小数   | 0–7 整数            | 无                       |
| SM/USUM | 0–1000 整数                 | ±99999999，6 位小数                     | ±99999999，6 位小数 | 无                       |
| 剑盾    | 0–18446744073709551615 整数 | ±99999999，6 位小数                     | ±99999999，6 位小数 | 三轴 ±99999999，6 位小数 |
| BDSP    | 0–1000 整数                 | 三轴 ±99999999；X/Z 无小数，Y 最多 5 位 | ±99999999，5 位小数 | 无                       |

未设置的 Minimum/DecimalPlaces 使用 NumericUpDown 默认 0；不使用其他世代的范围补全。
只接受十进制完整数字文本，不接受空白、指数、分组符、新非有限值或超出小数位的新输入。
省略即保持；相同原值及等值文本不重写，未改的超限值、NaN 载荷、无穷和负零按原始字节保持。
有效新值可明确修复异常坐标，不因其他坐标异常而禁用整组。
显示使用上游小数位数，未改字段不会因显示舍入而重写；应用后重新显示真实存储值，浮点舍入可能超出原输入的精度。

XY/ORAS 的 Situation6：地图 0x02、旋转 0x06，X/Z/Y 0x10/0x14/0x18。
坐标显示 raw/18，写入 `(float)(decimalInput*18)`；Core setter 同步地图 0xF4、旋转 0xF6、坐标 0x104/0x108/0x10C。
仅改动字段调用 setter，不将未改但不一致的关联位置归一化。

SM/USUM 的 Situation7：地图 0x00，X/Z/Y 0x08/0x0C/0x10，RX/RZ/RY/RW 0x14/0x18/0x1C/0x20。
坐标显示 raw/60，写入 `(float)(decimalInput*60)`；实际位置改动后调用 UpdateOverworldCoordinates，
同步 FieldMoveModelSave7 的同位置七个 float。不修改无关步数、特殊位置、LastZoneID 等数据。
旋转显示 atan2(RZ,RW)*360/π，修改旋转才将 RX/RY 清零并写入 sin/cos(input*π/360)；
只改地图或坐标时保留原四元数，再按上游同步场景位置。完全未变时不同步，保留原本不同的场景坐标。

剑盾 Coordinates8：地图 0x6000 的 ulong，X/Z/Y 0x10/0x14/0x18，缩放 0x20/0x24/0x28，
四元数 0x30/0x34/0x38/0x3C。坐标、缩放直接转换 float，旋转转换规则同第七世代，未改旋转保持。
BDSP ZoneID 为存档 0x5634 的 short，MyStatus8b 的 X/Y 0x40/0x44 为 int32，Height/Rotation 0x48/0x4C 为 float。
上游 Y 控件显示 5 位小数但写入 int，界面在应用前提示向零截断结果；Z 控件默认 0 位小数但原始 float 未改时仍保持。

请求先完成字段/范围校验再写入，每次 setter 后核对整数或 float 位模式；导出快照包含主位置、关联位置和旋转的原始字节。
工程检查覆盖五种存档的完整输出与独立 Core setter 对比、边界/单位换算/旋转、关联坐标及异常 float 保持/修复；
剑盾使用 Core 对象核对整个 Coordinates 数据区、uint64 最大值和超过 JS 安全整数的编号，仍缺真实序列化存档夹具。
五种存档的位置检查、剑盾 Core 对象、原生套件、22 项前端测试、变更文件 lint、类型、核心与网页构建通过，保留既有构建警告。
浏览器待核验，不代替所有者验收；完整 PKHeX 清单继续推进。

## 第七、八世代游戏版本标记（API 46）

训练家页新增三语版本选择，工作副本应用后更新摘要和配置候选；撤销与恢复原件重新选择有效候选。
配置下拉框使用稳定游戏编号作为值，翻译仅用于显示，修复中文/日文选择后无法匹配联动目标的问题。
版本改变后重置配置目标与默认值确认，避免误更新之前的配置；未改版本时保留用户选择。

来源为上游 `Gen6/SAV_Trainer.cs/.Designer.cs`、`Gen7/SAV_Trainer7.cs/.Designer.cs`、
`Gen8/SAV_Trainer8.cs/.Designer.cs`、`Gen8/SAV_Trainer8b.cs/.Designer.cs` 的 CB_Game 与保存逻辑。
第六世代 CB_Game 明确禁用，保持不可编辑。第七世代完整提供 SN/MN/US/UM 四项；剑盾 SW/SH，BDSP BD/SP。
不接受空值或目录外的新编号；相同原值不写入，保留未知原编号，支持明确改为目录中的有效编号。

使用 Core Version setter：第七世代 MyStatus7 字节 0x04，剑盾 MyStatus8 字节 0xA4；
BDSP MyStatus8b ROMCode 字节 0x2B 将 BD/SP 对应为 0/1。导出快照新增版本比较。
第七世代存档类型依长度与页脚识别，版本字段不会把 SM 转为 USUM，或反向转换。
界面明确说明不转换存档结构及宝可梦来源；SM/USUM 格式与标记不一致时暂停配置联动。
此限制仅影响配置候选，保留上游允许的四个版本编辑选项。

检查覆盖 SN、US、BD 工程存档的所有目录项、完整输出与独立 Core setter 对比、类型/箱子保持、
回读报告、无改动及非法请求；剑盾检查 Core 对象完整 MyStatus 区域，仍缺真实序列化存档夹具。
原生套件、21 项定向前端测试、全仓 190 文件/674 项测试、类型、核心与网页构建通过。
全仓格式和静态检查通过，保留既有 Hook 提示及核心裁剪/网页体积警告。
浏览器待核验，其他训练家字段与完整 PKHeX 清单继续推进。

## XY 训练家昵称与外观（API 47）

新增训练家页折叠入口，提供昵称、常用外观及高级属性；中文、英文、日文名称随界面语言切换。
名称使用可读描述并保留选项编号，不宣称服装译名为游戏官方译名。外观版本字段区别于存档游戏版本。
原始工程枚举含显示异常及未命名选项，界面明确标识；编号不保证所有组合都能在游戏中正常显示。

来源：上游 Gen6/SAV_Trainer.cs/.Designer.cs 的 TB_TRNick、PG_CurrentAppearance，Core 的
MyStatus6XY、TrainerFashion6、StringConverter6。仅 XY 支持，ORAS 中类似字节未使用，不开放此入口。
TB_TRNick.MaxLength 为 12，空白允许；Core Nickname 使用 Status 0x62 的 26 字节，UTF-16 长度最多 12。
明确修改时调用 ClearZero setter，并回读检查；不接受新增控制字符或无法回读一致的内容。
未改昵称保留原始尾部、异常长度及控制字符。昵称在本次语言修改后编码，与姓名使用相同的目标语言。

外观为 Status 0x30 起 16 字节，data0..3 为各 4 字节字。
绑定完整暴露男性 30 项、女性 34 项上游可写属性，使用 Core setter，不在前端重写位操作。
PropertyGrid 的 uint/enum 编辑器允许整数，Core setter 按位掩码截断；Web 拒绝不能原样表示的新值，
显示实际位宽范围，不静默截断。枚举既提供命名项，也允许位宽内未命名编号；布尔属性只接受 0/1。

| 字段            | 男性布局与可写范围      | 女性布局与可写范围            |
| --------------- | ----------------------- | ----------------------------- |
| `Version`       | data0 位 0，宽 3；0–7   | data0 位 0，宽 3；0–7         |
| `Model`         | data0 位 3，宽 3；0–7   | data0 位 3，宽 3；0–7         |
| `Skin`          | data0 位 6，宽 2；0–3   | data0 位 6，宽 2；0–3         |
| `HairColor`     | data0 位 8，宽 3；0–7   | data0 位 8，宽 3；0–7         |
| `Hat`           | data0 位 11，宽 5；0–31 | data0 位 11，宽 6；0–63       |
| `Front`         | data0 位 16，宽 3；0–7  | data0 位 17，宽 3；0–7        |
| `Hair`          | data0 位 19，宽 4；0–15 | data0 位 20，宽 4；0–15       |
| `Face`          | data0 位 23，宽 3；0–7  | data0 位 24，宽 3；0–7        |
| `Arms`          | data0 位 26，宽 2；0–3  | data0 位 27，宽 2；0–3        |
| `Unknown0`      | data0 位 28，宽 2；0–3  | data0 位 29，宽 2；0–3        |
| `Unused0`       | data0 位 30，宽 2；0–3  | data0 位 31，宽 1；0–1        |
| `Top`           | data1 位 0，宽 6；0–63  | data1 位 0，宽 6；0–63        |
| `Legs`          | data1 位 6，宽 5；0–31  | data1 位 6，宽 7；0–127       |
| `Socks`         | data1 位 11，宽 3；0–7  | data1 位 17，宽 5；0–31       |
| `Shoes`         | data1 位 14，宽 5；0–31 | data1 位 22，宽 6；0–63       |
| `Bag`           | data1 位 19，宽 4；0–15 | data2 位 0，宽 5；0–31        |
| `AHat`          | data1 位 23，宽 4；0–15 | data2 位 5，宽 5；0–31        |
| `Unknown1`      | data1 位 27，宽 2；0–3  | data1 位 28，宽 2；0–3        |
| `Unused1`       | data1 位 29，宽 3；0–7  | data1 位 30，宽 2；0–3        |
| `Contacts`      | data2 位 0，宽 1；0–1   | data2 位 10，宽 1；0–1        |
| `FacialHair`    | data2 位 1，宽 3；0–7   | 无                            |
| `ColorContacts` | data2 位 4，宽 3；0–7   | data2 位 19，宽 3；0–7        |
| `FacialColor`   | data2 位 7，宽 3；0–7   | 无                            |
| `PaintLeft`     | data2 位 10，宽 4；0–15 | 无                            |
| `PaintRight`    | data2 位 14，宽 4；0–15 | 无                            |
| `PaintLeftC`    | data2 位 18，宽 3；0–7  | 无                            |
| `PaintRightC`   | data2 位 21，宽 3；0–7  | 无                            |
| `Freckles`      | data2 位 24，宽 2；0–1  | data3 位 5，宽 3；0–1         |
| `ColorFreckles` | data2 位 26，宽 3；0–7  | data3 位 2，宽 3；0–7         |
| `Unused2`       | data2 位 29，宽 3；0–7  | data2 位 31，宽 1；0–1        |
| `Dress`         | 无                      | data1 位 13，宽 4；0–15       |
| `MascaraType`   | 无                      | data2 位 11，宽 2；0–3        |
| `Eyeliner`      | 无                      | data2 位 13，宽 2；0–1        |
| `Cheek`         | 无                      | data2 位 15，宽 2；0–1        |
| `Lips`          | 无                      | data2 位 17，宽 2；0–1        |
| `Mascara`       | 无                      | data2 位 22，宽 3；0–1        |
| `ColorEyeliner` | 无                      | data2 位 25，宽 3；0–7        |
| `ColorCheek`    | 无                      | data2 位 28，宽 3；0–7        |
| `ColorLips`     | 无                      | data3 位 0，宽 2；0–3         |
| `Unused3`       | 无                      | data3 位 8，宽 24；0–16777215 |

部分布尔属性占 2 或 3 位，Core 仅把原值 1 解释为 true。未改 false 时不清除其他原始位模式。
其他字段同样只调用改动项 setter，保留男性 data3、未知位和未使用位。请求先核对全部键与位宽。
导出快照包括完整 16 字节外观和 26 字节昵称，另外沿用性别、语言及校验和回读。

外观对象沿用载入时的性别布局，与桌面先取得 PropertyGrid 对象再保存的行为一致；同次改性别不会自动换装。
应用后按新性别重新读取这些字节。请求携带原性别，拒绝已经失配的草稿。
撤销和其他操作保留独立未应用字段；性别失配时保留外观草稿但暂停应用，提供单独重置入口，不影响其他训练家草稿。

检查覆盖两种性别所有属性及命名选项，完整文件与独立 Core 属性 setter 对比，非规范布尔/未使用位/昵称尾部保持，
空昵称、12 字符、多语言、非法请求及同时修改性别/语言。前端检查三语枚举/属性名称覆盖、范围和草稿重置/撤销。
原生套件、24 项定向前端测试、全仓 191 文件/698 项测试、最终类型、静态检查、核心与网页构建通过。
保留既有 Hook 提示及核心裁剪/网页体积警告；浏览器仍待核验，不把此入口等同于完整训练家或完整 PKHeX 已完成。

## 第一至第三世代基础图鉴（API 48）

独立图鉴入口对应 `PKHeX.WinForms/Subforms/Save Editors/SAV_SimplePokedex.cs/.Designer.cs`，
覆盖 SAV1、SAV2、GBA 的 SAV3RS/SAV3E/SAV3FRLG；后续世代等待包含形态、语言等完整规则的专用编辑器。
提供三语名称、本地宝可梦图片、名称/编号搜索、逐项见过/捕获及四种全选/全清操作。
搜索仅改变显示，批量操作作用于整本图鉴；只改草稿，应用后才进入工作副本、撤销与还原历史。

第一、二世代通过独立 Pokedex capability 开放此编辑器，不把它等同于所有编辑器都可用。
导出工作副本重新识别格式并检查校验，复制已经由编辑接口重算校验、回读验证的原始字节。
仍关闭这些格式的训练家、宝可梦等未开放编辑路径；第三世代沿用既有训练家草稿导出流程。

条目数分别为 151、251、386。请求必须每个编号恰好一次、包含两个明确的布尔值，
拒绝空表、漏项、重复项、越界编号和缺失布尔值。见过与捕获独立，不强制互相推导。
保存按上游 SaveAllFlags 遍历全图鉴调用 Core SetSeen/SetCaught，再执行 SanityCheck 对应处理。
这是明确的应用操作：即使勾选没有变化，也可能修复关联记录，界面提前说明。

来源为 Core `SAV1.cs`、`SAV2.cs`、`SAV3.cs`、`SAV1Offsets.cs`、`SAV2Offsets.cs`。
标记使用 `(species - 1)` 的位索引；末字节未使用位保留。

| 格式           | 捕获偏移   | 见过偏移   | 单组长度 |
| -------------- | ---------- | ---------- | -------- |
| 第一世代国际版 | 0x25A3     | 0x25B6     | 19 字节  |
| 第一世代日文版 | 0x259E     | 0x25B1     | 19 字节  |
| 金银国际版     | 0x2A4C     | 0x2A6C     | 32 字节  |
| 水晶国际版     | 0x2A27     | 0x2A47     | 32 字节  |
| 金银日文版     | 0x29CE     | 0x29EE     | 32 字节  |
| 水晶日文版     | 0x29AA     | 0x29CA     | 32 字节  |
| 金银韩文版     | 0x2A8E     | 0x2AAE     | 32 字节  |
| GBA            | Small 0x28 | Small 0x5C | 49 字节  |

第二世代只要应用后未知图腾为已捕获，Core SetCaught 就填充见过区 +0x20 起的 26 个字母记录；
首次遇见字节（见过区 +0x3B）为零时改为 A。清除捕获不清空已有字母记录，不改野外解锁组。
快照涵盖捕获位图及见过区起 0x3C 字节，包括字母、解锁组及首次遇见字节。

韩文金银使用两种校验和。上游 SAV2.GetFinalData 将主区求和写入 0x2DAB，
将 GetKoreanChecksum 的五段备份区求和写入 0x7E6B；ChecksumInfo 却把两处均与主区求和比较。
接入层 SaveChecksums 按实际写入规则分别核对，其他格式仍调用 Core.ChecksumsValid，未修改上游源码。
检查覆盖主区、备份区及两处校验值分别损坏时拒绝编辑和下载，避免把错误报告简单忽略。

第三世代 SetSeen 与 MirrorSeenFlags 同步 Small 的位图及 LargeBlock.SeenOffset2/SeenOffset3 对应区域，
快照涵盖三份完整位图及捕获位图。其他世代不套用这个同步规则。

读取与应用传入原文件名，通过 Core Metadata.SetExtraInfo 与 SAV3.IsVirtualConsole 判断特殊模式。
仅接受本地文件名（最多 1024 字符，无路径分隔符和控制字符），不读取任何额外文件。
对上游按 FireRed_/LeafGreen_ 且含 .sav 识别的特殊 FRLG 存档，按 Legal.IsForeignFRLG
清除 151–386 范围内不允许种类的捕获位，保留见过位。界面标识模式并禁用这些捕获选择，
批量捕获草稿预览排除禁用项；保存仍在 Core 端执行同一限制，不能靠绕过界面写入。

检查使用 Core 构造并填充队伍/箱子的 GB 工程存档、GBA 合成扇区及现有绿宝石工程存档。
对照上游完整保存步骤比较整个输出，覆盖独立标记、首尾编号、全部批量操作、区域布局、
未知图腾联动、GBA 关联位图、FRLG 文件名模式、完整下载副本及原件保持。
原生套件、全仓 192 文件/701 项前端测试、类型、静态检查、核心与网页构建通过。
这些是工程证据，不替代真实游戏存档与浏览器验收；保留既有警告，浏览器待核验。

## 第四世代图鉴（API 49）

对应上游 `PKHeX.WinForms/Subforms/Save Editors/Gen4/SAV_Pokedex4.cs/.Designer.cs`、
Core `Zukan4.cs`、`SAV4.cs` 及 SAV4DP/SAV4Pt/SAV4HGSS。使用独立 gen4 capability，
覆盖钻石／珍珠、白金、心金／魂银的 493 种图鉴、六种语言、性别与形态顺序、解锁级别及批量操作。
界面沿用悬浮存档面板、本地图像与中英日名称。当前条目有草稿时暂停切换及其他写操作，
应用或重置后继续；修改进入工作副本，可撤销、还原及导出。后续世代的专用图鉴仍未开放。

### 输入与版本边界

- 编号为十进制整数 1–493；批量范围使用 0 表示全图鉴，1–493 表示单种。
- 见过、捕获使用独立布尔记录。手动清除见过联动清空捕获、性别、形态及语言；
  首次勾选见过填入该种可用性别和形态。捕获控件只在见过时可操作，保留原始异常组合及上游批量行为。
- 性别列表用 0/1/2 表示雄／雌／无性别，取自当前存档 Personal 表；不允许重复或不适用值。
  双性别列表先后顺序直接对应 first/second 位。单性别与无性别按上游 SetEntry 写入规则处理。
- 形态为有序且不重复的编号列表，长度及每项范围由当前版本 Dex.GetForms 决定。
  DP 支持未知图腾 28、代欧奇希斯 4、无壳海兔／海兔兽各 2、结草儿／结草贵妇各 3；
  Pt/HGSS 增加洛托姆 6、谢米／骑拉帝纳各 2；仅 HGSS 增加皮丘 3（雄、雌、刺刺耳）。
  不把实体文件中的形态编号直接套用图鉴。列表使用 Core.SetForms 原始编码，回读展示实际保存结果。
- 语言固定 6 位，顺序为日、英、法、德、意、西，无韩文选项。
  DP 仅对 23、25、54、77、120、129、202、214、215、216、228、278、287、315 开放；
  Pt/HGSS 对 493 种开放。不支持的种类拒绝提交开启的语言位。
- 解锁值 DP/Pt 为 0–4（未获得、基础、识别形态、全国、外语），HGSS 为 0–3（无识别形态级）。
  通过 Core.DexUpgraded 写入对应标志，HGSS 同时联动 General[0x10D1] 的 bit 3。
- 动作只接受 entry、upgrade、clear、seen、caught、uncaught、complete，各动作拒绝混入其他载荷。
  entry 必须明确提供见过／捕获布尔值、完整性别、形态与 6 个语言值。
  非法编号、重复值、错误版本选项、缺少字段或载荷拒绝写入。

### 批量、保持与回读

五种批量行为直接调用上游 Zukan4.ModifyAll：清除见过调用 ClearSeen，清除捕获同时清空语言的全部 8 位，
全部见过补全性别但不自动捕获或补形态，全部捕获只改捕获，完整记录补见过／捕获／六语言／形态。
单种与全图鉴共用同一规则。UI 明示范围和关联影响，不用通用 CaughtAll 替换桌面菜单的实际参数。

未改条目与相同解锁级别跳过 setter，保留原始未规范化字节。读取形态时按有效编号过滤并去重，
避免桌面列表代码在异常形态排列中的索引问题。显式编辑使用 SetEntry 对应 Core setter，
不额外暴露桌面没有的晃晃斑 PID 编辑；完整文件比对检查其保持。
保存后回读相同格式、校验和及图鉴原始区域：DP 0x13A、Pt 0x31C、HGSS 0x338 字节，
起点分别为 General 的 0x12DC、0x1328、0x12B8，另核对 HGSS 0x10D1。

工程检查使用已有 D/Pt/HG 合成存档，对照独立 Core 调用比较整个输出，覆盖五种操作的单种／全范围、
所有解锁级别、全部可记录形态的顺序、固定／双性别、六语言、原始未改记录及非法请求。
最终原生套件、全仓 193 文件/705 项前端测试、类型、静态检查、核心与网页构建通过，保留既有警告。
浏览器仍待核验，不以工程存档代替真实存档验收。

## 第五世代图鉴（API 50）

来源为上游 `Gen5/SAV_Pokedex5.cs/.Designer.cs`、Core `Zukan5.cs`、
`SaveBlockAccessor5BW.cs` 与 `SaveBlockAccessor5B2W2.cs`。使用独立 gen5 capability，
接入黑／白、黑2／白2的 649 种记录、普通／闪光性别与显示、形态、语言、全国模式、打开图鉴时的种类和晃晃斑图案值。
沿用中英日界面、本地图像、工作副本、撤销和导出；不接入后续世代的不同图鉴结构。

### 字段和联动

- 种类十进制 1–649。见过与显示各 4 个布尔位：雄／无性别、雌、闪光雄／无性别、闪光雌。
  按当前 Personal 表禁用不适用性别。已有异常位可以保留或清除，不允许新增不适用位。
- 手动选择新的显示项清除其他显示项并勾选对应见过；首次勾选见过且没有显示项时自动设为显示。
  取消最后一个见过项清空显示；只取消其中一项时保留已有显示，遵循桌面事件规则。
  捕获独立，不强制推导见过。没有操作的原始多显示记录保持，新增显示必须唯一且已见过。
- 形态使用版本的 GetFormIndex 返回范围。每项有普通见过、闪光见过、普通显示、闪光显示四位。
  新显示形态在两类显示中唯一并补见过；取消见过形态不自动清除显示形态。
  BW 形态区每组 9 字节、72 个有效位；B2W2 每组 11 字节、83 个有效位，保留末尾未使用位，
  但“清除形态记录”按 Core 清除整个四组区域。B2W2 增加酋雷姆 3、凯路迪欧及三云各 2。
- 语言固定 7 位：日、英、法、意、德、西、韩。只开放 1–493，494–649 的开启语言位请求拒绝。
  上游 GetLanguageIndex 对 LanguageID.Korean 返回无效索引，因此“存档语言”批量模式不会登记韩文；
  全语言和手动韩文仍可写入。界面向韩文存档明确说明，未在接入层悄悄改写 Core 行为。
- 全国图鉴解锁与全国显示分别对应 Packed 的 bit 0、bit 11。界面修改解锁时同步显示，随后可单独修改显示。
  打开时种类对应 bit 12–21；新值限制 1–649，原始 0 或越界 10 位值可不变保留。
  应用单种条目同时将该种设为打开时种类，与桌面保存当前选择一致；批量操作不改此值。
- 晃晃斑图案为八位十六进制展示，对应 uint32。输入最多 8 字符，调用 Util.GetHexValue：
  空串为 0，忽略非 ASCII 十六进制字符，界面提前说明，应用后显示重新读取的八位值。
- 条目须提供明确捕获布尔值、4 个见过、4 个显示、7 个语言和四组完整形态布尔数组。
  全局须明确提供两个布尔值、种类与图案字符串。各类动作拒绝混合载荷、非法范围及不适用修饰选项。

### 批量语义与副本保持

将桌面隐藏修饰键转换为明确选项：“包含闪光”对应 Shift，“全部语言”对应 Ctrl，
当前种类清除见过对应 Alt。提供当前种类完整／清除见过，全图鉴见过全设／全清、捕获全设／全清、
完整记录，以及全图鉴形态清除／补首个／补全部。界面每项写明作用范围，未应用草稿阻止其他写操作和切换。

按上游直接调用 GiveAll、SeenNone、SeenAll、CaughtNone、CaughtAll、ClearFormSeen、SetFormsSeen1、SetFormsSeen。
清除见过只改四组见过位，保留捕获、显示、形态和语言；清除捕获同时清空语言。
补首个形态是追加，不先清除其他形态；包含闪光也不清除未选择覆盖的原记录。
保留 Core 在仅闪光形态显示时判断显示状态的既有行为，后续手动新选显示仍保证唯一。

回读校验覆盖同一具体存档类型、校验和、完整图鉴可写区：BW 0x4D4 字节、B2W2 0x4DC 字节。
区域从图鉴 Magic 开始，含 Packed、九组种类位图、四组形态、432 字节语言及 uint32 晃晃斑值。
完整输出与独立 Core 调用比较，并检查未改原件、Packed 其他位、各修饰组合、全部可记录形态、
特殊语言和非法请求。最终原生套件、全仓 194 文件/710 项前端测试、类型、静态检查、核心与网页构建通过。
保留既有警告；Chrome 刷新仍载入旧资源，界面待核验。工程检查不替代浏览器及真实存档验收。

## 第六世代图鉴（API 51）

依据上游 `Gen6/SAV_PokedexXY.cs/.Designer.cs`、`SAV_PokedexORAS.cs/.Designer.cs` 和 Core `Zukan6.cs`。
接入 SAV6XY/SAV6AO 的 721 种图鉴：普通／闪光性别与显示、七语言、形态、全国图鉴模式、
初始显示种类、晃晃斑图案、XY 旧世代来源及 ORAS 两类计数、DexNav 批量计数。
第五／六世代复用 FlagPokedexEditor，保留各自语言范围、文本长度及专属字段；其余世代不套用此结构。

### 范围与保存顺序

- 种类为 1–721；七种语言对全部 721 种开放。见过／显示四位及手动新显示的唯一性规则沿用第五世代，
  保留未修改的异常旧位。原件不变，编辑进入工作副本、撤销、还原和导出链。
- XY 的旧世代获得标记只对 1–649 开放，与本世代捕获独立；650–721 必须为空。
  ORAS 不提供此字段；XY 不接受 ORAS 计数请求。
- ORAS 遇见／获得次数使用 Designer 的 `00000` 五位 Mask，Core 为 ushort：空白为 0，
  允许数字及 Mask 的空格／下划线，拒绝负号、小数或超过五字符，65536–99999 保存为 65535。
  使用 Util.ToUInt32 并截到 ushort.MaxValue，与桌面 Clamp 一致。界面说明获得计数没有实际游戏调用。
  先写见过位、再写用户计数，保留显式“见过但次数 0”组合，不用 SetSeen 的默认补 1 覆盖草稿。
- 全国解锁／显示为 Packed bit 0/1，初始种类为 bit 6–15；与第五世代不同，由对应 Core setter 处理。
  原始 0 或越界 10 位初始种类可不变保持，新值限定 1–721；保存单种同时更新初始种类。
- 第六世代 TB_Spinda 没有设置 MaxLength，沿用 WinForms 默认 32767，不错误继承第五世代的 8 字符上限。
  [TextBoxBase.MaxLength 官方说明](https://learn.microsoft.com/en-us/dotnet/api/system.windows.forms.textboxbase.maxlength?view=windowsdesktop-10.0)。
  仍以八位十六进制显示，调用 Util.GetHexValue，空串为 0，忽略非十六进制字符，超长有效数字保留低 32 位。
- 形态入口按 GetFormIndex 确认可记录种类，手动列表长度和名称按当前 EntityContext 的 FormConverter，
  与桌面 SetEntry 一致；XY 不显示 ORAS 新增形态。特别地，ORAS 多丽米亚 Core 批量 count 为 1，
  桌面手动列表为 10：本入口保留这 10 项手动读写，批量仍按 Core 仅补首项，不以批量 count 缩减手动功能。

### 明确的上游差异与批量规则

- XY 桌面初次加载形态错误地使用窗口 TabIndex；接入层使用 GetFormIndex 返回的真实种类偏移，
  避免读入其他种类的位后在保存时覆盖当前记录。检查包含非零偏移的异常原始形态记录保持。
- Core.Zukan6.SeenAll 误用第五世代 BW 的 Personal 表；接入层遍历 1–721，
  调用 CompleteSeen 并传入当前第六世代 Personal 表。检查第六世代纯雌性花蓓蓓的普通与闪光位。
  不修改 vendored 源码；当前单种 GiveAll 保留 Core 原流程。
- ORAS 桌面 DexNav 菜单循环 0–720，会修改保留的第 0 项并漏掉 721。
  本入口的“全图鉴”明确处理 1–721，保留第 0 项，只设置遇见次数 999 或 0，不影响获得次数。
- XY 批量清除见过同时清除旧世代获得标记，批量获得会补该标记；ORAS 批量清除见过同时清零两类计数。
  ORAS 当前种类 Alt 等效操作后，若仍为已捕获且遇见次数为 0，按桌面 B_GiveAll 的最终保存行为设为 1。
- 其他完整／见过／捕获／形态操作及闪光、全语言选项保留对应 Core 行为。
  韩文单语言批量索引限制与第五世代相同，界面仍提示手动韩文或全语言操作。

回读比较同一具体格式、校验和及整段可写图鉴区：XY 0x6A0，ORAS 0x11CC 字节。
工程检查对照独立 Core 调用比较完整文件，涵盖两种格式全部形态种类、字段范围、所有批量修饰、
Packed 未使用位、长十六进制、空白／溢出计数、原始异常显示保持及非法跨版本字段。
原生套件、全仓 195 文件/714 项前端测试、类型、静态检查、核心与网页构建通过，保留既有警告。
浏览器仍待核验，不以工程存档代替真实存档验收。

## 第七世代太阳／月亮与究极日／月图鉴（API 52）

来源：PKHeX 26.08.26 的 SAV_PokedexSM.cs／Designer.cs、Zukan.cs、Zukan7.cs、DexFormUtil、
SAV7SM／SAV7USUM 与 SaveBlockAccessor7SM／USUM。第七世代 Let's Go 使用其他窗口，本入口不混用。

- 本体种类 SM 1–802、USUM 1–807，加形态共 1061／1116 条；列表不限于游戏阿罗拉图鉴。形态条目由 GetEntryNames、
  GetBaseSpecies、GetCountFormsPriorTo 和 GetEntryIndex 对应，采用从零开始的图鉴条目索引。
  形态名称使用当前版本 FormConverter 与三语资源，不虚构无存储位的形态。
- 每个条目有普通／闪光、雄性（含无性别）／雌性四种见过及显示位。
  GetBaseSpeciesGenderValue 决定允许项，包括超能妙喵本体雄性、另一形态雌性的特殊规则。
- 捕获及九种语言只对本体开放；形态的捕获必须为 null、语言必须为空。
  本体语言按日、英、法、意、德、西、韩、简中、繁中排列。前后端均拒绝不完整数组、
  越界条目、跨条目草稿和不适用字段；布尔控件无进制或空值转换。
- 手动选显示会补同项见过并清除其他显示，最后一个见过被取消时清空显示。
  新增显示必须唯一且已见过，禁止新增性别不适用位；未改变的异常旧显示／性别位保留。
- 当前条目完整登记全部适用见过及本体捕获／九语言，若无显示则补普通适用性别。
  当前条目清除对应桌面 Control + Check All：清空该条目全部记录，不作用于同种其他形态。
- 全图鉴清除见过同时清除捕获、显示与语言；清除捕获仅清捕获及语言。
  正向批量遍历全部本体和 GetAllFormEntries 返回的去重形态，保留其形态过滤规则。
  见过会包含闪光，为本体补缺失的普通显示，并清除未捕获本体语言；形态显示保持原状。
  全部捕获先执行同样见过步骤，再用存档语言替换语言数组；完整登记全部九种语言。
  Designer 使用 Click 事件，程序批量勾选不触发手动联动，不额外补形态显示。
- 不引入其他世代的全国解锁、初始条目或晃晃斑编辑字段。保留图鉴未编辑字节，
  导出后重读核对具体格式、校验和及完整 0xF78 字节图鉴区；原件不变，沿用工作副本与撤销。

独立工程夹具覆盖两种版本全部条目映射、性别、九语言、单条目与五种全图鉴操作、
最后一种宝可梦、异常旧记录、非法请求和损坏校验和。原生套件通过。
全仓前端测试首轮 716/717 通过，一项日期测试因启动子进程超过默认 5 秒而超时；
以 30 秒上限单独重跑同组三项，全部通过（测试耗时 2.79 秒），未修改日期代码或断言。
类型检查、静态检查、PKHeX 核心与网页构建通过；保留既有 Hook、核心裁剪、网页体积／插件耗时警告。
浏览器核验仍待可用的新版本页面，不将代码检查视为所有者验收。

## Let's Go 图鉴与捕获记录（API 53）

来源：PKHeX 26.08.26 的 SAV_PokedexGG.cs／Designer.cs、SAV_Capture7GG.cs／Designer.cs、
Zukan7b、CaptureRecords、SAV7b 与 SaveBlockAccessor7b。复用第七世代的见过／显示、
九语言、索引和三语界面；不扩大其他格式的可写字段。

### 图鉴与体型

- 手动列表保留 Core 的 1–809 本体及独立形态，共 852 条。正向批量只遍历 1–151、808、809，
  形态按 GetAllFormEntries 去重，跳过皮卡丘／伊布搭档形态；普通与闪光位均包含。
- 体型索引由 TryGetSizeEntryIndex 确认，共 153 本体加 33 形态，186 份。
  每份有最小／最大身高、最小／最大体重四组；每组包含是否记录、身高系数、体重系数和纪录标记。
- Designer 的八个 NumericUpDown 均为十进制整数 0–255，默认最小值 0，无小数。
  网页数值输入清空按 0，拒绝负数、小数或超出 byte；这些是系数，不展示为 cm／kg。
  身高 254 加体重 127 为未记录标记，即使勾选已记录，这一组合保存后仍读为未记录。
- 取消已记录时，界面回填 254／127 并取消纪录标记；服务端未记录项写该默认组合。
  标记按独立复选框保留；未变化的记录不调用 setter，保持异常原始标记和保留字节。
  被改动记录通过 SetSizeData 保存，按 Core 将组内第 3 字节置 0，保留第 4／5 字节。
- 修复桌面 SetEntry 对形态提前 return 而未写体型的遗漏：全部 33 形态可独立修改体型。
  全图鉴清除也覆盖形态体型；完整／全部捕获只补本体缺失纪录，最小两项为 0/0、最大两项为 255/255，
  保持已记录值。当前条目补全／清除仅作用于图鉴标记，不更改体型或捕获／传送次数。

### 捕获与传送次数

- 种类限定 1–151、808、809，共 153 项，索引使用 CaptureRecords 的映射。
  单种捕获 0–9999、单种传送与两类总数 0–999999999；网页用十进制文本避免科学计数和隐式截断，
  最多 10 字符用于保留原始 uint，空串、负号、空格、小数、指数和越界新值均拒绝。
  原有超上限 uint 值可不变保持，不可新写入或作为批量模板；未修改计数不调用会截断的 setter。
- 应用次数保存当前种类和两类总数；重新合计先保存当前种类，再合计全部 153 项并截到总数上限。
  提供与桌面点击标签等效的最大值／归零按钮。两类总数可独立编辑，不强制等于分项和。
- 批量先应用总数，再以当前两项作为模板：非零只处理图鉴已捕获种类，零覆盖所有种类；
  对未捕获种类保留旧计数，不先把模板写入当前种类。只在批量所得合计低于总数时下调总数，
  不隐式抬高，保持桌面流程；需要相等时使用重新合计。
- 修复 Core.SetAllTransferred 的 uint 累加溢出：适配层两类合计均用 ulong，避免多个大额传送数
  绕回低值后错误降低总数；不修改 vendored 核心。
- 捕获次数与图鉴标记互不自动推导。待应用次数草稿会阻止其他图鉴操作，图鉴草稿也会阻止次数操作。

SAV7b 本批开放图鉴与次数及已验证工作副本下载，其他编辑入口仍按能力清单推进。
保存后重读验证格式、校验和、完整 0x20E8 字节图鉴块与 0x10A4 字节捕获记录块。
独立皮卡丘版／伊布版工程夹具验证映射、体型形态写入、批量范围、原始异常值、
计数边界及溢出、保留字节和整个导出文件。原生套件、197 文件／721 项前端测试与静态检查通过。
前端测试使用 30 秒单项上限，以容纳上一批已确认的时区子进程启动延迟，断言未修改。
类型检查、核心与网页构建通过，保留既有 Hook、核心裁剪、网页体积／插件耗时警告。
次数编辑应用后保留当前种类及面板展开状态，只清除已应用草稿。浏览器与所有者验收待完成。

## 晶灿钻石／明亮珍珠图鉴（API 54）

来源：PKHeX 26.08.26 的 SAV_PokedexBDSP.cs／Designer.cs、Zukan8b.cs、
SAV8BS.cs、Gem8Version.cs 与 FormConverter.cs。新增独立图鉴界面，不沿用其他世代的显示位或形态索引。

- 种类固定 1–493；图鉴状态为十进制枚举 0 未登记、1 听说过、2 见过、3 已捕获。
  未改变的原始 int32 异常值可保持，界面以原始值选项显示；不允许新增越界状态。
  状态、四种性别／闪光标记、九语言、普通／闪光形态独立，不自动联动勾选或限制手动性别组合。
- 语言顺序为日、英、法、意、德、西、韩、简中、繁中，对应 LanguageID 1–5、7–10。
  单种请求必须包含四个性别、九个语言及两组完整形态布尔数组；缺失状态／种类、长度错误或跨种类草稿拒绝。
- 形态仅为 Zukan8b.GetFormCount 指定的 13 种：未知图腾 28、飘浮泡泡 4、代欧奇希斯 4、
  结草儿／结草贵妇／绅士蛾各 3、樱花儿／无壳海兔／海兔兽各 2、洛托姆 6、
  骑拉帝纳／谢米各 2、阿尔宙斯 18。列表按桌面 FormConverter.Take(count) 与 Gen8b 上下文。
  界面保留两类形态的独立勾选，闪光形态不自动补普通形态。
- 当前种类勾选／清除对应 Check All／Control + Check All：设置状态 3／0、四性别及九语言全真／全假，
  不修改形态，语言高位通过逐语言 setter 保持。形态菜单也只作用当前种类：
  普通全选同时清闪光，闪光全选保留普通，清除则清两组；均不改状态／性别／语言。
- 全图鉴清除通过 SetAllSeen(false) 清状态、性别、形态和语言；全部见过保留更高状态及已有闪光，
  按 Core PersonalTable.BDSP 登记普通性别，不改语言／形态。无性别种类会登记两性，保留上游语义。
  只有全部见过和完整记录接受包含闪光选项，对应桌面的精确 Control 修饰。
- 全部捕获调用 CaughtAll()，设置捕获、按 Personal 表补普通性别、清闪光性别，仅追加存档语言并保留其他语言，
  不改形态。清除捕获将已捕获状态降为见过并清全部语言，保留性别／形态。
  完整记录补全普通形态、全部九语言；未选包含闪光时保持已有闪光性别和形态。
- 全国图鉴开关独立保存，不修改地区图鉴。未改动的状态、形态、全国开关和语言位保持原始数据；
  Core 性别 setter 会写四个 uint 字段，适配层在写后恢复未变化字段的原始四字节，避免局部修改清洗异常旧值。
  明确执行的批量操作仍遵循 Core 的重置／覆盖语义，不将手动保留规则套到批量上。
- 原件保持不变，编辑进入工作副本与撤销链。写后比较整个 0x30B8 字节图鉴区、格式与校验和。
  晃晃斑附加纪录和其他存档数据不在本窗口修改。

工程夹具覆盖 BD／SP 两版本及 1.0／1.1／1.2／1.3 四种文件长度、493 种与全部 13 种形态、
手动异常值保持、全部菜单操作及修饰选项、非法请求、全国／地区与晃晃斑隔离、原件与完整导出文件。
八组图鉴专项检查和新增的局部性别字段原始值保持检查通过；全仓 198 文件／724 项前端测试、
类型、静态检查、最终原生套件及核心／网页构建通过。前端单项上限 30 秒，
保留既有 Hook、核心裁剪及网页体积／插件耗时警告。
浏览器与所有者验收待完成。

## 剑／盾分块存档工程夹具

来源：PKHeX 26.08.26 的 SCBlock.cs、SCTypeCode.cs、SCXorShift32.cs、SwishCrypto.cs、
BlankBlocks8.cs、SaveBlockAccessor8SWSH.cs、SAV8SWSH.cs、SaveUtil.cs 与 Zukan8.cs。

- 上游空白模板只有块键和数据长度，类型为 None，不能作为真实存档往返证据。
  保留原有 SaveService 拒绝该模板的检查，不放宽生产识别器的文件长度和哈希要求。
- 新增仅用于测试的合成分块夹具，通过公开 SCBlock 线格式读取器构造有类型的数据块，
  不使用反射、不修改 vendored Core。已测访问器的当前箱与解锁箱数用 Byte，
  运行时语言用 UInt32，殿堂时间用 UInt64，壁纸用 Byte 数组。
  未知块的类型为合成设置，不表示游戏的完整块类型表。
- 剑／盾两版本各覆盖三种图鉴块组合；移除扩展图鉴块用于验证图鉴版本判断，
  不声称重建了对应补丁版本的完整存档结构。
  本体／铠岛／冠原图鉴实际地址总数分别为 400／611／821；跨地区重复种类保留独立地址。
- 检查加密文件哈希、无改动导出逐字节相同、标量与数组回读，以及选定图鉴项的
  见过位、捕获位和 uint32 战斗次数写出后重读。完整比较块顺序、类型、子类型、长度和数据，
  仅允许预期位与四个计数字节变化；保留其他条目、保留区及原始输入。
- 合成样本直接经过 SAV8SWSH 和 SwishCrypto，不绕过或伪造 SaveService 文件识别。
  这组证据只覆盖工程序列化，真实游戏存档、产品入口及浏览器验收仍待完成。

六组分块专项及原生全套检查通过。本批仅增加测试与文档，API 54 和产品代码不变。

## 剑／盾图鉴（API 55）

来源：PKHeX 26.08.26 的 SAV_PokedexSWSH.cs／Designer.cs、Zukan8.cs、FormConverter.cs、
SAV8SWSH.cs 与 SaveBlockAccessor8SWSH.cs。沿用静态 Worker、工作副本及撤销，不改原存档。

- 按 GetRawIndexes 读取伽勒尔、铠岛、冠之雪原的真实记录；按绝对地址排序，
  不用物种编号折叠重复项。界面按地区筛选并标明主记录／重复记录，使用本地图像和三语名称。
- 每条记录提供四组 64 个见过形态位、九语言、捕获、超极巨化经历、显示形态／性别／闪光／超极巨化、
  战斗次数；武道熊师额外提供连击流超极巨化经历。形态位含未使用位，遵循桌面可独立编辑的规则。
  霜奶仙使用 63 种装饰组合；武道熊师 62／63 位分别对应两种超极巨化形态。
- NUD_Form 未覆盖 NumericUpDown 默认范围，显示形态输入为十进制 0–100；
  NUD_Battled 明确限制 0–2147483647。性别下拉为 0 雄、1 雌、2 无性别。
  底层形态 13 位、性别 2 位和战斗次数 uint32 中未改动的范围外原值保持；不允许引入新的范围外值。
  数字文本只接受 1–10 个十进制数字，拒绝空值、负号、小数、空格及指数；应用前验证完整草稿。
- 手动写入仅改选中的物理记录，并跳过未变化字段，保留语言高位与两个保留字。
  请求必须带完整四组形态、九语言及所有标量；武道熊师额外字段在其他种类必须为 null。
  所有检查先于写入；非法地址、数组长度和跨字段请求拒绝。
- Give All 遵循桌面物种操作，修改当前物种的主图鉴记录，即使选择的是重复记录。
  全见过、全捕获、清除捕获、完整登记和全战斗次数同样沿用 Core 的主记录范围。
  清除全部调用 SeenNone，清空三个图鉴区，包括重复记录和保留区。
  前四种登记操作按桌面 Shift 修饰提供包含闪光；清除和次数操作不接受此选项。
- 保留 Core 的批量语义：清除捕获还清显示及两个保留字；CaughtAll 可更新显示性别，
  CompleteDex 和单种 Give All 的包含闪光主要影响见过位。批量操作不套用手动字段保持规则。
  全战斗次数接受独立十进制模板，范围外原值不能当作批量模板。
- 前端按地区选择记录，四组形态折叠展示。存在草稿时暂停切换和批量操作；重读工作副本后清草稿。
  写后重新识别格式并比对三个图鉴块快照；生产文件长度和加密哈希识别保持严格。

测试使用已说明边界的合成分块样本，覆盖两版本与三种图鉴组合、形态和语言、全部菜单、
异常原值保持、非法／缺字段请求、无关块和加密往返。真实游戏存档的 SaveService 端到端证据、
外部浏览器检查及所有者验收仍待完成，不以合成样本替代。

六组专项和最终原生全套、199 文件／729 项前端测试、最终类型、静态检查、核心和网页构建通过。
批量完整输出与 Core 对照，对随机显示性别验证物种范围后单独归一对比，其余位逐字节相同。
保留一次测试 worker 退出超时提示（测试全部通过、退出码 0），以及既有 Hook、裁剪和网页体积警告。

## 阿尔宙斯图鉴与高级研究（API 56）

来源：PKHeX 26.08.26 的 SAV_PokedexLA.cs／Designer.cs、SAV_PokedexResearchEditorLA.cs／Designer.cs、
PokedexResearchTask8aPanel.cs／Designer.cs、PokedexSave8a.cs、PokedexSaveData.cs、PokedexSaveResearchEntry.cs、
PokedexSaveStatisticsEntry.cs、PokedexResearchTaskType8a.cs、FormConverter.cs 与 SaveBlockAccessor8LA.cs。
任务、招式、属性和委托名称使用 Core 的三语资源；只身道等文案核对 WinForms 的 lang_zh-Hans／ja。

- 242 种按洗翠编号排列；保留每个可存储且非王／女王形态的真实 form 编号，不把过滤后的列表序号当作 form。
  每形态提供野外见过、获得、野外捕获三组各八位，顺序为普通／头目／闪光／闪光头目，每组含两种性别。
  各位独立，未自动限制组合。已获得形态数按 PokemonInfoGenders 计算，包含性别与共用性别计数规则。
- 显示形态由上游可选形态集约束；显示雌性仅在 HasMultipleGenders 返回真时可改。
  闪光、头目、完成只身道独立编辑。原始异常显示形态未变时保持；若超出 Core 的 0–119 可表示范围，
  必须先选择有效形态才能修改显示组，避免 Core 静默忽略整组请求。
- 研究任务沿用种类专属阈值、每阶段普通／奖励点数和完成所需标记。进度为十进制 0–60000，
  NUP_CurrentValue 与高级窗口全部 NumericUpDown 的范围相同；未改动的原始 ushort 高值保留。
  获得形态数、剧情与委托进度只读；前者在形态勾选时计算预览，提交仍保持原有只读值，写后由 Core 重读。
- 高级窗口完整提供 30 项：捕获及九种条件捕获、四个招式使用槽、三个属性击败槽、击败、刚猛／迅疾、
  进化、喂食、道具眩晕、惊吓、引诱，以及树木／落叶／雪／矿石／草丛跳出计数。
  招式／属性按当前种类任务参数命名，未分配参数保留上游槽位编号说明。所有计数验证后才写入。
- 编辑进度与汇报研究分开。汇报调用 UpdateSpecificReportPoke，更新已汇报阶段、研究值、完美／完成标记、
  汇报索引、地区完成状态和累计研究点。已更新、完成、完美、索引和已汇报值只读；不直接伪造完成开关。
  预估值遵循上游不减少已汇报阶段的规则。草稿先应用或重置，才能执行汇报或切换种类。
- 体型四个输入保留默认 TextBox 的 32767 字符上限；使用固定小数点和 .NET Single 解析，允许指数及特殊浮点值。
  空白或无法解析的文本保留对应原值。Core 将负的最小值归零；最大值低于最小值或关闭最大体型时使用最小值。
  理论范围来自 PA8.GetHeightAbsolute／GetWeightAbsolute 的 0／255 边界，仅作显示，不作为额外输入限制。
- 无改动不调用 setter；隐藏最大体型、NaN 原始位、保留字段及不相关块保持。修改体型组时才执行该组的 Core 整理规则。
  修正桌面空条目分支可能丢弃显式只身道／显示设置的问题，显式应用会保存这些字段；不额外登记无关任务。
  改动记录／进度时沿用 Core 的更新索引联动。任务翻译显式使用请求语言，避免 Core 全局语言影响嵌入的招式／属性名。
- API 56 开放 SAV8LA 图鉴编辑和工作副本导出；通用宝可梦／训练家编辑范围不在本批扩展。
  Worker 更新协议、重新识别导出文件并比较完整 0x1E460 图鉴块，原件保持，沿用撤销链。

工程夹具覆盖基础／Daybreak 版本标记的两种合成块组合，未知块类型不代表真实游戏结构，
不伪造 SaveUtil 文件长度。检查 242 种、所有可编辑形态、三语任务、30 项计数、汇报、体型整理／无法解析回退、
异常原值与保留数据、非法／缺字段请求以及完整加密导出与 Core 对照。
真实游戏存档的 SaveService 端到端、外部浏览器及所有者验收仍待完成。

两种合成修订专项与最终原生全套、200 文件／736 项前端测试、最终类型、静态检查及核心／网页构建通过。
保留既有 Hook、核心裁剪、网页体积与构建插件耗时警告，本批未进行浏览器验收。

### ORAS 试玩版训练家（API 120，工程检查通过）

试玩版实际长 0x5A00，十六块目录和 BEEF 识别标记由 SAV6AODemo／SaveBlockAccessor6AODemo 定义。Situation 在 0x1000，Status 在 0x3C00，Party 在 0x3E00，Records 在 0x5400；Box 未初始化，HasBox 为假。读取返回零箱子及真实队伍，箱子目录不提供名称、壁纸、交换或批量操作。

源 SAV_Trainer.cs 对试玩版移除 Multiplayer／Maison，且没有 ISaveBlock6Main／IMultiplayerSprite。API 120 因此只增加独立训练家／记录／导出能力，不开放普通宝可梦与背包编辑。基本姓名、ID、性别、金钱、时间、地理、日期、徽章、BP／里程沿用已核对第六世代输入；Overview 的 Vivillon 可编辑，保留编号；坐标与姓名废字节沿用来源整窗规则。普通操作不重写隐藏留言与标记；明确整窗重新保存才重编码五留言、同步里程记录并重置 ORAS 模型。

新增 OR／AS × 两性别的合成完整存档专项，对照源 Core 全文件输出，覆盖真实队伍／无箱子、可见及禁止字段、坐标、废字节、整窗、基础训练家、记录、校验拒绝、冻结哈希、原件与精确工作副本导出。前端专项 38 项与四布局原生专项通过；完整 verify 的 251 文件／1015 项测试、格式／Lint／类型／网页打包，完整原生、API 120 核心构建与裁剪后 26 类型检查均通过。最新核心的最终网页／PWA 打包通过；浏览器和真实存档未验收。

### 第七世代细胞／贴纸（API 121，工程检查通过）

2026-10-11 已读 SAV_ZygardeCell.cs／Designer 与 EventWork7.cs。SM 是 95 格基格尔德细胞，USUM 是 100 格霸主贴纸；来源语言资源标题明确同时包含细胞／贴纸，不能把共享 Core 名称 ZygardeCell 当作两游戏的同一物品。每格状态 UInt16 位于事件数值编号 198+i，来源候选为 None／Available／Received 对应 0／1／2。储存数量与已收集分别位于编号 161／169，两个 NumericUpDown 默认最小零、显式最大 65535，不能误限为格数。上游旧状态大于 2 会在载入时抛错，网页需要明确显示异常并保护未修改值。

GiveAll 按非 Received 格数量增加已收集，SM 同时增加储存数量，USUM 不增加储存数量；不能简单把计数设成 95／100。保存逐格写入并保存两计数，USUM 还同步记录 72。增加后的计数若超过 65535，网页需在工作副本写入前拒绝，保护原件与请求原子性。两游戏分别使用来源完整位置数组，格位不可互换；API 121 已接入独立核心／Worker／三语产品入口；普通补丁保护未指定旧值，全部领取与整窗保存遇未知旧状态时拒绝，来源重保存同步 USUM 记录 72。SN／MN／US／UM 原生专项与更新后前端专项 34 项通过；完整 verify 的 252 文件／1023 项测试、格式／Lint／类型及网页打包通过，完整原生、API 121 核心构建和裁剪后 26 类型检查通过；最新核心的最终网页／PWA 打包通过，浏览器及真实存档未验收。位置生成器保持来源 95／100 格顺序并拒绝缺失的翻译描述；用户界面按游戏显示细胞或霸主贴纸。

### 第七世代殿堂（API 122，工程检查通过）

2026-10-11 已读 SAV_HallOfFame7.cs／Designer 与 EventWork7.cs 的 HallOfFame7。窗口不是完整宝可梦记录，而是首次／当前两组六种类，共十二个 UInt16，连续 24 字节；SM 位于事件块 0x9C4，USUM 位于 0xA3C。源窗口按 GetEntry(i)／SetEntry(i) 的 i*2 地址访问，不能使用 First1 等独立属性代替，其中 First3／First4 属性错误地重复 0x04 地址，而索引接口没有该错误。

十二个候选沿用 GameInfo.FilteredSources.Species，并保留原始异常编号直到明确修改；界面可使用本地种类图像，但数据不包含形态、异色、昵称或训练家，不应伪造这些信息。只有 USUM 显示初始宝可梦加密常数，TB_EC 最大八位十六进制，保存用 Util.GetHexValue，空值为零。源窗口取消不保存，保存顺序写十二格后更新 USUM 的 Misc.StarterEncryptionConstant；网页需一次验证后写入工作副本并提供撤销。新增核对 WinFormsUtil.GetIndex：它将 SelectedValue 为 null 的未选项视为 0，而非 -1；因此明确来源整窗保存会将不在候选中的旧种类归零，普通逐项补丁仍需保留未指定旧值，并在预览中区分这种规范化。USUM 加密常数是 Misc 块 0x148 的 UInt32，Accessor 给出的块基址 0x4400，实际绝对地址 0x4548；SM 对应块基址 0x4000，但窗口隐藏此控件，不得因属性存在而开放。API 122 已接独立核心、JSExport、Worker、三语入口及十二格本地种类图像；种类候选使用共享可搜索控件，普通补丁、来源重保存、完整文件冻结预览和既有撤销／导出接通。四游戏首轮原生专项和三文件前端 33 项通过；八组跨标记／真实布局扩展专项已通过，类型通过；完整 verify 的 253 文件／1029 项测试、格式／Lint／类型及网页打包通过，完整原生、API 122 核心构建及裁剪后 26 类型检查通过；最新核心的最终网页／PWA 打包通过，浏览器及真实存档未验收。候选缓存不能只以游戏标记为键，需保留 SAV7SM／SAV7USUM 真实类型。

### 第七世代训练家窗口（API 123，工程检查通过）

2026-10-11 已通读 SAV_Trainer7.cs 并核对 Designer；基础姓名／ID／性别／金钱／语言／地理／时间／日期／位置／游戏标记及对应点数已有通用入口，本批补齐宝可搜寻镜三项计数与五种相机版本／陀螺仪、十二项对战树纪录、外观肤色、投球动作及 SM 两套解锁列表、护照章、Mega／Z 招式及超级对战模式标记、广场姓名、刷新天数、Vivillon、飞行目的地与地图显示、服装库存及姓名废字节，USUM 还有四项冲浪分数和洛托姆姓名／好感度／抽奖标记。

Designer 明确：对战树十二项上限 65535；宝可搜寻镜三计数、圆庆广场币上限 9999999，BP 与洛托姆好感度 9999，刷新天数 255，四冲浪分数 999999999；广场姓名最多 20 字符，训练家／洛托姆姓名最多 12。地图 0–1000，X／Y／Z／朝向均 ±99999999、六位显示小数。坐标六十倍缩放，朝向读取 atan2(RZ,RW)*360/PI，保存 sin/cos(value*PI/360) 并清零 RX／RY；只有地图可用且数值实际改变才写整组与镜像。相关 Core 参数、地址与默认最小值已按来源核对。

阿罗拉时间候选对应 1–23 小时以及索引零的 24 小时（Sun Time）；12 小时显示 Moon Time。旧零载入为 24 小时，9999999 或不在候选中的值禁止修改。SM 飞行目的地比 USUM 少六项，地图显示少四项；标记基址 SM 3200、USUM 4160，加源码独立偏移数组，Moon／Ultra Moon 两个目的地名称也有替换。投球动作 SM 不含 Nihilist，解锁起点 292、学会起点 3479；首两解锁与首个学会状态强制选中，USUM 的两套列表隐藏，不能沿用 SM 地址。

服装操作先清整个 Fashion 块，再按基础／全部合法／全部物品与真实类型／性别选择来源八个载荷或 Reset；需独立差异预览及撤销，不以全 FF 代替。性别控件改变会将肤色候选的低位同步性别，手选不匹配肤色的保存有明确确认分支。洛托姆同步提示位于 SaveTrainerInfo 之后，其条件仍比较输入姓名与已保存 SAV.OT；普通改名不据此假设自动触发同步。独立核心、三语标签／地图索引／服装载荷生成器，以及冻结请求／预览／完整导出路径已接入。八种游戏／性别布局的原生字段／标记／服装／位置、完整重保存与基础输入专项通过；所有者验收仍待完成。

Core FieldMenu7.RotomAffection 在写入时截顶 1000，源窗口控件却允许 9999；预览需显示实际保存值。PokeFinder7.ThumbsHighValue 的 setter 会在最高值超过总值时同步提高总值，源保存按总值、最高值顺序执行。FashionBlock7.Clear 清除前 0x1A08，八个载荷只有 1388–1449 bytes，ImportPayload 复制前缀；须保留清空后尾部的零值及区域之外数据。

产品入口已接入基础训练家区下方，包含全部扩展分组、服装三种来源载荷、姓名字符／废字节五种操作与六位 ID。ID 来源为 TrainerIDManager.cs、TrainerTID.cs 与 TrainerSID.cs：公开 ID 六位、隐藏 ID 四位，空值零，SID 最大 4294 且用旧 TID 检查整对溢出后可能降为 4293；再写新 TID，保持来源 UInt32 回绕并在预览显示最终 ID32／TID／SID／TSV。基础姓名为空可保存，性别修改同步肤色低位；不更改真实存档布局。

来源重新保存对搜寻镜计数／相机、BP／庆典金币／洛托姆好感度截顶，原金钱掩码取前七位、分钟／秒取前两位再余 60；未知旧 Vivillon／投球动作／时差仍保留。广场和洛托姆姓名按 ClearZero 重编码，训练家姓名未改则保留废字节。日期范围为 2000-01-01 至 2050-12-31 00:00:00，最后保存时间只保留分钟；不能载入的源窗口值拒绝整体重新保存。JoinFesta7.FestaCoins 位于 0x508，写入会同步 0x50C 总金币为记录 38 已使用金币加余额并截顶；专项整文件对照包含此联动。首次异常夹具将 0x50C 误当余额，修正为 0x508 后八组合及新增 ID／基础联动专项通过。外部 Chrome 连接请求失败，浏览器和真实存档未验收。

最终八组专项及前端 254 文件／1039 项测试通过，最后界面格式／Lint／类型检查通过。原生完整首轮在通用训练家测试发现旧预期遗漏 Gen7 肤色联动，已以独立 status +0x54 bit 2 地址更新预期，并重跑该项及全部后续原生检查通过；首轮前段证据保留。API 123 浏览器核心构建、裁剪后 26 类型属性检查、最新核心最终网页／PWA 打包通过。预览将相机版本、肤色及标记按选项名称展示，保留未知原始值提示；肤色确认点击区域 44px。浏览器与真实存档仍待所有者验收，不能据此宣称整个 PKHeX 接入目标完成。

### Let's Go 训练家与 GO Park（API 124，工程检查通过）

来源为 PKHeX 26.08.26 SAV_Trainer7GG.cs／Designer、SAV7b、SaveBlockAccessor7b、Coordinates7b、Misc7b、MyStatus7b、PlayerGeoLocation7b、PlayTime7b、GP1／GoParkStorage、Fashion7b、EventWork7b，以及共用 TrashEditor（Subforms/PKM Editors/Text.cs）。本批不能只覆盖基础姓名，需同时接入竞争者姓名、六位 ID、日期、完整位置与缩放、称号／服装及 GO Park 文件工作流。

两姓名最大 12 UTF16 单元，原始区域各 26 bytes；训练家在 status 0x38，竞争者在 misc 0x200。金钱掩码七位，最大 9999999、空值零；小时五位 UInt16，空值由来源 ushort.Parse 拒绝；分钟／秒两位、空值恢复零、保存余 60。游戏仅 GP／GE，语言跟随 Generation=7／Gen7b 的来源目录并同步 status 与 config 两处。ID 使用与 Trainer7 相同的六位／四位控件和 SID 先写顺序，保持 UInt32 回绕。基础变更及废字节操作均保留未指定数据。

地图编号为 UInt64，控件上限完整 ulong.MaxValue，浏览器必须始终以字符串传递。X／Z／Y、三个缩放及角度均 ±99999999、六位显示小数；此窗口没有 SM 的六十倍位置缩放。任一值实际改变，写全部八项，RX／RY 归零，RZ／RW 为 sin／cos(角度*PI/360)。坐标块基址 0x47A00，位置 0x10／14／18、缩放 0x20／24／28、四元数 0x30–3C，地图在块内 0x6000。无效或空数字保留旧值，无法载入的整体坐标组禁用。冒险时戳在 PlayerGeoLocation 块内 0x48 的 UInt64 1970 秒值；最后保存用 PlayTime 块 +4 的四字节 1900 packed 时间，没有秒存储。日期选择器 min=2000-01-01、max=2099-12-31 00:00:00；分别选择日期和时钟后可组合一天内的时间，来源重保存仍需拒绝不能载入的原始完整值。

GO Park 块位于 0x4E200，20 区 × 50 格共 1000 个 GP1，每格 0x1B0（432）bytes。GP1 不是 PB7；保留种类／形态／性别／异色、浮点等级、CP／HP、三项 GO IV、捕获地与两用户名、日期及 GO 招式编号，并按当前语言解读种类／招式。未知旧值不得阻止原始导出。单个导入按来源只校验长度，允许覆盖选定格；批量来源按文件顺序、小写 .gp1 扩展、严格长度筛选，从指定格开始跳过非空格，达到容量后不继续写入，回执区分放入／过滤／未放入。

单个导出允许空格，全部导出只含非零种类，均返回完整原始 bytes。静态界面以 ZIP 替代原版目录选择，并用格位目录避免重复文件名丢失；摘要复制与 20 区图片列表已接入。删除单个／全部写 new GP1 模板，其实际头部 64 bytes 包含固定数值，不能按源码注释中的 0x20 或全零推断。称号全部解锁为事件块 +0x1298 的 156 位，保留最后四个无关位；服装使用 Core 的玩家／伙伴两套固定载荷，而不是全 FF。

TrashEditor 只将临时编码中实际写出的前缀复制到原始缓冲。SAV7b.SetString 忽略传入 None、实际调用 StringConverter8 默认 ClearZero，不能在整个原始姓名缓冲上调用它来模拟文字编辑；共享助手改为保留原始缓冲，仅复制编码长度范围，完整十六进制与层叠／清理按来源执行。GP／GE × 两性别专项通过完整文件来源对照、全部基本字段、日期、UInt64、位置、双姓名、GP1 导入规划与导出、模板删除、称号／服装、冻结与原件保护；前端领域八项通过。产品入口、Worker 与 API 124 握手已接入；含 ZIP 的四组合原生专项通过，三文件前端专项 39 项通过。API 124 浏览器核心、裁剪后 26 类属性、最终界面类型及串行等价 verify 的 255 文件／1050 项测试、网页／PWA 打包通过；实际页面与真实存档仍待检查，不能标记所有者验收完成。

## 独立存档工作区（工程通过，页面待核验）

2026-10-12 按所有者认可的 Demo 方向接入正式主导航。乱数与存档区域保持挂载，以 hidden／inert 隔离非活动区域，不因切换丢失已打开文件、工作副本、撤销或 RNG 模块缓存。原悬浮工具按钮保留为存档工作区快捷入口，不再创建第二个编辑器实例。

现有 62 项功能标签、游戏能力条件与 Core 请求保持原值，按宝可梦与道具、训练家与记录、事件与配信、游戏功能、批量与文件分组。桌面左栏 224px，窄屏使用项目共享 Select 及 optgroup；顶部文件操作、中央活动任务和箱子右侧详情复用现有模块。乱数档案联动复用训练家页面的原字段、状态与保存动作，同时放入宝可梦详情栏，不创建第二份档案状态。输入框、按钮与选择器沿用项目 44px 几何、15px 标签和主题／焦点／禁用反馈。稀有能力仍由原模块折叠与分页控制，不增加后端、第二份存档或 UI 示例数据。

迁移前后 AST 对照确认全部 62 项标签／能力表达式一致。新增接线 Lint 与两文件 10 项 95878、4096 MB 类型 12748、完整 verify 19959 均退出码 0；网页／PWA 253 项、24180.09 KiB。固定工作区样式仅作用于存档文件编辑器，单只宝可梦编辑器保留原有长表单滚动。Core／Worker 协议未改，沿用已通过工程检查的 API 137 核心。Chrome 连接仍返回通信错误，尚未执行外部浏览器或真实存档核验，不能将源码或 SSR 检查等同于所有者验收。

本批首轮完整类型退出 0；定向 Lint 无错误，发现两处校验上下文 useMemo 未使用依赖的提醒，已将实体／修订标识显式纳入注册表 scope，待完整工程重跑。拦截提示增加无效表单名称，方便定位修正。

本批后续 .tmp/pkhex-stats-native-linked.log 退出 0：六格式四文件布局，以及 LGPE 引用队伍的箱位、BDSP／SWSH／LA／SV／ZA 箱位与普通队伍的完整存档对照通过。LGPE 两次样本准备失败分别为直接 SetPartySlotAtIndex 与仍按普通 PartyData 初始化；按来源 HasParty=false 和已存在的 TextTrashSessionTests 样本方法，初始化存储队伍指针、重开并使用实际箱位后通过。产品范围与识别未改。另补零 IV 的攻击／速度推荐值区别覆盖，由后续默认完整套件执行。首轮完整类型与定向 Lint 已通过；最后增加稳定面板、草稿同步和条件焦点恢复，实际 Chrome 行为未核验。
