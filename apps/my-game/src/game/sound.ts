import { createSound } from 'utils-sound';

export type MusicName =
	| 'bgm_main'
	| 'bgm_freespin'
	| 'bgm_winlevel_big'
	| 'bgm_winlevel_epic'
	| 'bgm_winlevel_max'
	| 'bgm_winlevel_mega'
	| 'bgm_winlevel_superwin';

export type SoundEffectName =
	| 'jng_intro_fs'
	| 'sfx_anticipation'
	| 'sfx_bigwin_coinloop'
	| 'sfx_btn_general'
	| 'sfx_btn_spin'
	| 'sfx_fs_respins'
	| 'sfx_multiplier_landing'
	| 'sfx_multiplier_up'
	| 'sfx_reel_stop_1'
	| 'sfx_scatter_stop_1'
	| 'sfx_scatter_stop_2'
	| 'sfx_scatter_stop_3'
	| 'sfx_scatter_stop_4'
	| 'sfx_scatter_stop_5'
	| 'sfx_scatter_win_v2'
	| 'sfx_superfreespin'
	| 'sfx_wild_explode'
	| 'sfx_winlevel_end'
	| 'sfx_winlevel_small'
	| 'sfx_youwon_panel';

export type SoundName = MusicName | SoundEffectName;

const sound = createSound<SoundName>();

export { sound };
