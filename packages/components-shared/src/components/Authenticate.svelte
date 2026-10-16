<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	import { requestAuthenticate, requestReplay } from 'rgs-requests';
	import { stateUrlDerived, stateBet, stateConfig, stateReplay, stateUi } from 'state-shared';
	import { API_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

	type Props = { children: Snippet };

	const props: Props = $props();

	let authenticated = $state(false);
	// why authenticate or the replay failed: shown instead of the game
	let failure = $state<unknown>(null);

	const authenticate = async () => {
		try {
			const authenticateData = await requestAuthenticate({
				rgsUrl: stateUrlDerived.rgsUrl(),
				sessionID: stateUrlDerived.sessionID(),
				language: stateUrlDerived.lang(),
			});

			// error
			if (authenticateData?.error) throw authenticateData;
			if (!authenticateData?.balance || !authenticateData?.config) {
				throw { error: 'ERR_AUTHENTICATE', message: 'No balance or config from the game server.' };
			}

			// balance
			if (authenticateData?.balance) {
				// Example of authenticateData.balance
				// {
				// 		"amount": 10000000000000000,
				// 		"currency": "USD"
				// },
				// upper case, so a social currency like "xsc" still shows as SC
				stateBet.currency = authenticateData.balance.currency.toUpperCase();
				stateBet.balanceAmount = authenticateData.balance.amount / API_AMOUNT_MULTIPLIER;
			}

			// config
			if (authenticateData?.config) {
				// Example of authenticateData.config
				// {
				// 	"gameID": "37_test-lines",
				// 	"minBet": 100000,
				// 	"maxBet": 1000000000,
				// 	"stepBet": 10000,
				// 	"defaultBetLevel": 1000000,
				// 	"betLevels": [100000, 200000, ..., 1000000000],
				// 	"betModes": {},
				// 	"jurisdiction": {
				// 			"socialCasino": false,
				// 			"disabledFullscreen": false,
				// 			"disabledTurbo": false,
				// 			"disabledSuperTurbo": false,
				// 			"disabledAutoplay": false,
				// 			"disabledSlamstop": false,
				// 			"disabledSpacebar": false,
				// 			"disabledBuyFeature": false,
				// 			"displayNetPosition": false,
				// 			"displayRTP": false,
				// 			"displaySessionTimer": false,
				// 			"minimumRoundDuration": 0
				// 	}
				// }
				const { minBet, maxBet, stepBet, defaultBetLevel, betLevels = [] } = authenticateData.config;
				stateConfig.jurisdiction = authenticateData?.config?.jurisdiction;
				// only the RGS bet levels, kept inside minBet - maxBet
				const levels = betLevels.filter(
					(level) => (!minBet || level >= minBet) && (!maxBet || level <= maxBet),
				);
				// without any, every stepBet from minBet to maxBet
				if (levels.length === 0 && minBet && maxBet && stepBet) {
					for (let level = minBet; level <= maxBet; level += stepBet) levels.push(level);
				}
				// a bet the RGS hasn't allowed is never shown or sent
				if (levels.length === 0) {
					throw { error: 'ERR_AUTHENTICATE', message: 'No bet levels from the game server.' };
				}
				stateConfig.betAmountOptions = levels.map((level) => level / API_AMOUNT_MULTIPLIER);

				// open on defaultBetLevel, or the level closest to it
				const defaultBet = (defaultBetLevel || 0) / API_AMOUNT_MULTIPLIER;
				const betAmount = stateConfig.betAmountOptions.reduce((closest, level) =>
					Math.abs(level - defaultBet) < Math.abs(closest - defaultBet) ? level : closest,
				);
				stateBet.betAmount = betAmount;
				stateBet.wageredBetAmount = betAmount;
			}

			// round
			if (authenticateData?.round) {
				// Example of authenticateData.round 
				// {
				// 	"betID": 62277967,
				// 	"amount": 1000000,
				// 	"payout": 33400000,
				// 	"payoutMultiplier": 33.4,
				// 	"active": true,
				// 	"state": [...],
				// 	"mode": "BONUS",
				// 	"event": null
				// }

				if(authenticateData.round?.state) {
					// @ts-ignore
					stateBet.betToResume =  authenticateData.round;
				}

				// a finished round keeps defaultBetLevel; only a round being resumed sets the bet
				if(authenticateData.round?.active && authenticateData.round?.amount) {
					const betAmountValue =
						authenticateData.round.amount > 0
							? authenticateData.round.amount / API_AMOUNT_MULTIPLIER
							: 0;
					stateBet.betAmount = betAmountValue;
					stateBet.wageredBetAmount = betAmountValue;
				}

				if (authenticateData.round?.active && authenticateData.round?.mode) {
					stateBet.activeBetModeKey = authenticateData.round.mode;
				};
			}
		} catch (error) {
			console.error(error);
			failure = error;
		}
	};

	// a currency code Intl can format, e.g. USD, JPY or XSC
	const isCurrency = (code: string) => {
		try {
			new Intl.NumberFormat('en', { style: 'currency', currency: code });
			return true;
		} catch {
			return false;
		}
	};

	const handleReplay = async () => {
		stateBet.betAmount = (stateUrlDerived.amount() / API_AMOUNT_MULTIPLIER) || 0;
		stateBet.wageredBetAmount = (stateUrlDerived.amount() / API_AMOUNT_MULTIPLIER) || 0;
		stateBet.activeBetModeKey = stateUrlDerived.mode();
		// a replay has no session to get the currency from: it comes in the url. Without a valid one, a
		// social replay shows SC (never "$"), others the default.
		if (isCurrency(stateUrlDerived.currency())) {
			stateBet.currency = stateUrlDerived.currency().toUpperCase();
		} else if (stateUrlDerived.social()) {
			stateBet.currency = 'XSC';
		}

		try {
			const data = await requestReplay({
				rgsUrl: stateUrlDerived.rgsUrl(),
				game: stateUrlDerived.game(),
				mode: stateUrlDerived.mode(),
				version: stateUrlDerived.version(),
				event: stateUrlDerived.event(),
			});

			// @ts-ignore TODO: update the schema.ts
			if (!data?.state?.length) throw data?.error ? data : { error: 'ERR_REPLAY', message: 'This round could not be found.' };

			// @ts-ignore
			stateReplay.bet = {
				...data,
				event: '0',
				active: true,
				mode: stateUrlDerived.mode(),
			};
			// @ts-ignore TODO: update the schema.ts
			stateReplay.costMultiplier = Number(data.costMultiplier) || 1;
			stateBet.betToResume = { ...stateReplay.bet! };
		} catch (error) {
			console.error(error);
			failure = error;
		}
	};

	// what the error screen shows: the RGS error code only, as its message can use words social mode
	// can't (the whole error is in the console)
	const failureText = (error: any) => (typeof error?.error === 'string' ? error.error : `${error}`);

	onMount(async () => {
		if(stateUrlDerived.replay()) {
			stateUi.config.mode = 'replay';
			await handleReplay();
		} else {
			stateUi.config.mode = 'default';
			await authenticate();
		};

		// the game only loads once it is connected
		authenticated = !failure;
	});
</script>

{#if authenticated}
	{@render props.children()}
{:else if failure}
	<div class="failure">
		<h1>Sorry, the game could not connect.</h1>
		<p>{stateUrlDerived.replay() ? 'The replay could not be loaded.' : 'The game server could not be reached, or the session is not valid.'} Please reload the game to try again.</p>
		<code>{failureText(failure)}</code>
	</div>
{/if}

<style lang="scss">
	.failure {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
		box-sizing: border-box;
		background: black;
		color: white;
		font-family: sans-serif;
		text-align: center;

		h1 {
			margin: 0;
			font-size: 1.25rem;
		}

		p {
			margin: 0;
			max-width: 32rem;
		}

		code {
			max-width: 32rem;
			opacity: 0.6;
			font-size: 0.75rem;
			overflow-wrap: anywhere;
		}
	}
</style>
