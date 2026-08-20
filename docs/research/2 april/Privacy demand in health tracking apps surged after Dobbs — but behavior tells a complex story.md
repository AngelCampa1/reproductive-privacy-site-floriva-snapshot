# Privacy demand in health tracking apps surged after Dobbs — but behavior tells a complex story

**Despite widespread calls to "delete your period tracker" following the June 2022 Dobbs decision, overall period-tracking app use actually increased by 20%.** The paradox: consumers expressed intense privacy anxiety yet kept tracking — and in many cases, switched to apps that *marketed* privacy rather than apps with genuinely stronger protections. This report compiles every available quantitative data point on consumer demand for privacy-focused health tracking apps, organized by six research categories.

---

## 1. Period tracker abandonment was minimal despite viral alarm

The most striking finding across all available research is the gap between public discourse and actual behavior. Media coverage in summer 2022 urged millions of women to delete period trackers, but population-level data tells a different story.

The largest and most rigorous study — a **population-based analysis of ~23,000 women** aged 18–44 across five U.S. states (Arizona, Iowa, New Jersey, Ohio, Wisconsin) — found that period/fertility-tracking technology use **increased from 37.4% pre-Dobbs to 45.2% post-Dobbs**, an adjusted prevalence ratio of **1.20 (95% CI: 1.15–1.26)**. In Ohio specifically, usage rose from 34.2% to 44%. The only behavioral shift was a modest *decrease* in tracking for the purpose of becoming pregnant (aPR = 0.85). Lead author Emily Neiman noted: "It doesn't seem like people heeded the advice to stop using fertility trackers." This study was published in *Contraception* (Elsevier) in January 2025.

A Duke University vignette survey (n=183, published at ACM CHI '24 in May 2024) found that **only 3% of participants (5 of 183) stopped using period-tracking apps specifically because of the Roe overturn**. While 31% of participants had switched or stopped using apps at some point, the majority cited usability issues (54%) rather than privacy (20%). A striking **91% had never used any privacy mitigation strategy** at all. However, when explicitly prompted, **60% said the Dobbs decision impacted their perceived concerns** about period app data practices — suggesting awareness without action.

One important counterpoint: Willis et al. (2024), studying the PRESTO preconception cohort (n=1,832), found a **27-percentage-point reduction in fertility app engagement** in states with banned or restricted abortion rights post-Dobbs, compared to little change in protected states. This suggests behavioral effects were concentrated among women actively trying to conceive in restrictive states. The data deletion service Rightly reported a **4,400% increase** in health app data deletion requests in the weeks following the decision, though this figure lacks peer-reviewed verification.

**Baseline data for context:** KFF's 2019 survey (n=996) found approximately **1 in 3 women** of reproductive age used cycle-tracking apps. Rock Health's 2021 consumer survey (n=~8,000) found **25–30%** tracked periods digitally, with slightly lower rates (25%) in states that subsequently restricted abortion.

| Metric | Value | Source | Date | Sample |
|---|---|---|---|---|
| Overall tracker use change post-Dobbs | +20% (37.4% → 45.2%) | Neiman et al., *Contraception* | Jan 2025 | ~23,000 |
| Women who stopped apps due to Roe overturn | ~3% | Cao et al., CHI '24 / Duke | May 2024 | 183 |
| Women whose *perceived concerns* increased | 60% | Cao et al., CHI '24 / Duke | May 2024 | 183 |
| Women who used any privacy mitigation | 9% | Cao et al., CHI '24 / Duke | May 2024 | 183 |
| Fertility app engagement drop (ban states) | −27 percentage points | Willis et al., *PPE* | 2024 | 1,832 |
| Data deletion request surge | +4,400% | Rightly (industry) | June 2022 | N/A |

---

## 2. App switching favored privacy *marketing* over genuine privacy

The Dobbs weekend (June 24–27, 2022) produced one of the most dramatic app-switching events ever documented — but the primary beneficiaries were apps that *signaled* privacy rather than those with verified protections.

**Stardust**, an astrology-themed period tracker, surged **6,000%** in daily downloads (Apptopia), climbing from #119 to **#1 on the U.S. Apple App Store** on June 25. Sensor Tower data showed Stardust gained **82% of its total 400,000+ lifetime installs** in just two days (June 25–26), with approximately 200,000 downloads on June 25 alone. However, TechCrunch's subsequent investigation found Stardust was sharing users' phone numbers with Mixpanel, a third-party analytics service — undermining its privacy claims.

**Clue**, the Berlin-based tracker that emphasized GDPR protections, saw a **2,200% increase** in installs and reached **#15 overall** on the App Store (its highest-ever ranking), though it dropped to #93 by Monday. **Flo**, holding **47% U.S. market share** (Apptopia) with 48 million monthly active users, saw only a modest rank improvement (#197 → #180) — likely reflecting simultaneous gains and losses. Flo responded by launching "Anonymous Mode" in September 2022 but carried reputational damage from its 2021 FTC settlement for sharing data with Facebook and Google.

Other notable download changes on June 25 versus the June monthly average (all Apptopia data): Eve by Glow (+83%), Natural Cycles (+53%), Glow Ovulation (+21%), Period Tracker by GP Apps (+17%), and Femometer (+10%).

**The truly privacy-first apps saw no measurable download data.** Euki (nonprofit, local-only storage), Drip (open-source, Android-only), and Periodical (open-source, local storage) are too small for any analytics firm — Sensor Tower, Apptopia, data.ai, or AppMagic — to track publicly. Consumer Reports identified these three as having the strongest privacy protections, but their obscurity meant the privacy-motivated demand overwhelmingly flowed to better-marketed alternatives with weaker actual protections.

| App | Download change (Dobbs weekend) | Peak App Store rank | Data source |
|---|---|---|---|
| Stardust | +6,000% daily average | #1 overall | Apptopia/Sensor Tower via TechCrunch |
| Clue | +2,200% installs | #15 overall (all-time high) | Apptopia/Sensor Tower via TechCrunch |
| Eve by Glow | +83% | — | Apptopia via TechCrunch |
| Natural Cycles | +53% | — | Apptopia via TechCrunch |
| Flo | Modest (#197 → #180) | #180 | Sensor Tower via TechCrunch |
| Euki, Drip, Periodical | No public data available | — | Too small for analytics tracking |

---

## 3. Willingness to pay for privacy exists but lacks a direct "period tracker premium" study

**No study has directly measured how much consumers would pay specifically for a privacy-focused period tracker.** This remains the most significant data gap in the research landscape. However, converging evidence from adjacent studies suggests meaningful willingness to pay for privacy in health apps generally.

A discrete choice experiment by Xie, Liu, and Or (2023, *mHealth* journal, n=561) found that **security and privacy were a statistically significant positive factor** in health app purchase decisions, with a marginal willingness-to-pay range of **HK$25–183 (~US$3–$23)**. A companion study (Liu, Xie, and Or, 2024, *SAGE Digital Health*, n=577) found **58.9% of respondents were willing to pay for health apps**, with a median willingness-to-pay of approximately **US$6.50**. Both studies surveyed Hong Kong adults, limiting U.S. generalizability.

Broader consumer privacy data reinforces this demand signal. Cisco's 2024 Consumer Privacy Survey (n=2,600+, 12 countries) found **75% will not purchase from organizations they don't trust with their data** and **38% qualify as "Privacy Actives"** — consumers who care about privacy, are willing to act, and have switched providers over data practices, up from 32% in 2022. Deloitte's 2023 Connected Consumer Survey reported **75% of consumers willing to pay a premium for devices with extra security layers**.

However, a UC Berkeley study (2020, n=998) examining actual behavior found that among the **20% of consumers who preferred paid apps** over free ones, **only 6% cited security and privacy** as the reason — most wanted ad removal. Furthermore, the study found **48% of paid app versions bundled identical third-party tracking libraries** as their free counterparts, meaning paying more often *didn't* deliver better privacy in practice.

The period tracker market's pricing structure reveals an irony: the most privacy-protective apps (Euki, Drip) are **completely free** and nonprofit-funded, while data-collecting apps charge premiums — Flo at **$9.99/month**, Natural Cycles at **$14.99–$16.99/month**, Clue at **~$8/month**. Only Floriva ($2.99/month, on-device storage) approximates a paid privacy-first model.

---

## 4. Consumer trust in health app data handling is low and declining

A consistent finding across multiple surveys is that consumers deeply distrust health app data practices — and critically, **81% of Americans incorrectly assume health app data is protected by HIPAA** (ClearDATA/Harris Poll, May 2023, n=2,053). This misconception is perhaps the most consequential statistic in the entire landscape, because most period tracking apps fall entirely outside HIPAA's scope.

The ClearDATA/Harris Poll survey also found **58% of Americans who use digital health apps have never considered where their data is shared**. A stark age divide emerged: **60% of 18–34 year-olds** would still use a health app knowing data would be shared with third-party marketers, compared to only **17% of those over 65**. Conversely, 62% of college-educated Americans said they would *not* use an app under those conditions.

**Rock Health's longitudinal consumer surveys** (n=8,000+ annually) document a steady erosion in health data sharing willingness: the share of consumers willing to share health data with health tech companies **fell from 25% in 2020 to just 14% in 2023**. The average number of entity types consumers would share health data with dropped from 3.4 in 2022 to 2.7 in 2023. Even trust in sharing with doctors declined from 70% to 64% over the same period.

KFF's September 2025 Health Tracking Poll (n=1,334) provides the most recent granular data: **78% are concerned about privacy** when a health app is managed by the government, **75% when managed by a private technology company**, 64% when managed by an insurer, and 52% when managed by a hospital. Only **41% trust a health app using AI** to manage their care.

| Metric | Value | Source | Date | Sample |
|---|---|---|---|---|
| Wrongly believe HIPAA covers health apps | 81% | ClearDATA/Harris Poll | May 2023 | 2,053 |
| Never considered where health app data goes | 58% | ClearDATA/Harris Poll | May 2023 | 2,053 |
| Willing to share health data with health tech cos | 14% (down from 25% in 2020) | Rock Health | Oct–Nov 2023 | 8,014 |
| Concerned about tech company–managed health apps | 75% | KFF Health Tracking Poll | Sept 2025 | 1,334 |
| Concerned about hospital-managed health apps | 52% | KFF Health Tracking Poll | Sept 2025 | 1,334 |

---

## 5. Download trends reveal a brief spike, not a lasting shift

App store data tells a story of intense but ephemeral privacy-driven switching. The dramatic download surges documented in Category 2 were overwhelmingly concentrated in the **48–72 hours** following the Dobbs decision. Clue's rank fell from #15 to #93 within two days; Stardust's surge accounted for 82% of its *entire lifetime downloads*. No public data from any analytics firm documents sustained elevated downloads for privacy-focused apps beyond the first week.

The broader market continued its pre-existing trajectory. **Flo** grew from 48 million monthly active users in June 2022 to **70 million by late 2024**, and its revenue reached approximately **$275 million** with unicorn valuation status ($1B+). The overall period tracking app market was valued at **$749 million–$1.69 billion** in 2023–2024 (estimates vary by research firm) and is projected to reach **$1.7–$5.1 billion by 2030–2032**, reflecting a CAGR of **9–20%**. Revenue data from July 2024 shows Flo earning approximately **$8.8 million/month** in in-app revenue, dwarfing Natural Cycles (~$950K), Clue (~$600K), and all others.

A critical data gap: **no analytics firm has published data tracking downloads of Euki, Drip, or Periodical** — the three apps consistently identified by Consumer Reports and privacy researchers as having the strongest protections. These apps remain invisible in market data, making it impossible to quantify whether the post-Dobbs privacy demand produced lasting adoption of genuinely privacy-first tools.

Academic research on actual app data practices underscores the gap between marketing and reality. Alfawzan et al. (2022, *JMIR*, n=23 apps) found **87% of popular women's mHealth apps shared data with third parties**, **61% allowed location tracking**, and only **52% requested user consent** before collecting data. Shipp and Blasco (2020, *PoPETs*, n=30 apps) found **66% of menstrual apps didn't even mention collecting period data** in their privacy policies.

---

## 6. Broad privacy anxiety spans all health apps but rarely drives behavior change

Privacy concern in health apps is widespread and growing, but a consistent "intention-action gap" characterizes consumer behavior across all health app categories — not just period trackers.

**Pew Research Center's** May 2023 survey (n=5,101) found **72% of Americans want more regulation** of corporate data practices (bipartisan: 78% Democrats, 68% Republicans), **67% say they understand little to nothing** about what companies do with their data (up from 59% in 2019), and **49% have stopped using a digital product or service** due to privacy concerns. Yet **56% always or almost always click "agree"** on privacy policies without reading them.

**Morning Consult** (January 2023, n=2,201) found **56% of U.S. adults** are "very" or "somewhat" concerned about health data privacy on mobile apps — actually *down* from 64% in September 2021, suggesting some normalization of digital health despite Dobbs. Millennials showed the largest decline (down 13 points to 52%).

Mental health apps present particularly acute privacy failures. Mozilla's *Privacy Not Included review found **22 of 32 mental health apps** warranted privacy warnings. A *Psychiatric Services* study found **49% of mental health apps shared data with third parties**, and **41% lacked a privacy policy entirely**. The FTC ordered BetterHelp to pay **$7.8 million** in March 2023 for selling patient data to Meta, Snapchat, and others.

For fitness trackers and wearables, Deloitte's 2021 survey found **40% of users concerned about data privacy** from their devices. Notably, Mozilla's review found all five wearable devices tested (Garmin, Fitbit, Apple Watch, Oura Ring, Whoop Strap) *passed* privacy standards — a striking contrast to period and mental health apps.

The Deloitte 2025 Connected Consumer Survey captured a broader inflection point: **fewer than 48% of consumers** now believe the benefits of online services outweigh privacy concerns — the lowest since tracking began in 2019, down from 58% just one year prior.

---

## Conclusion: a market signal buried in contradictions

The post-Dobbs period tracker landscape reveals five key insights that extend beyond reproductive health into the broader privacy-first app market.

**First, privacy demand is real but mostly passive.** Sixty percent of women acknowledged heightened concerns, yet only 3–9% took concrete action. The 20% *increase* in overall tracker usage post-Dobbs suggests functional utility outweighs privacy anxiety for most users.

**Second, privacy *marketing* captured demand that privacy *engineering* did not.** Stardust's 6,000% download spike — for an app later found sharing data with third parties — while genuinely private apps like Euki remained too obscure to measure, demonstrates that consumer intent does not reliably flow to the most protective products.

**Third, willingness to pay for privacy is moderate but not yet validated for reproductive health specifically.** Cross-domain evidence suggests $3–$23 marginal willingness to pay, but the market's structure — where the most private apps are free and the most expensive apps collect the most data — has not been tested by a true paid-privacy-first entrant at scale.

**Fourth, the HIPAA misconception (81% of consumers) represents an enormous market education opportunity.** Most consumers believe their health app data has legal protections it does not have, creating latent demand that could activate if awareness increases — particularly through enforcement actions, which have historically driven behavior change (as the FTC's Flo and BetterHelp actions demonstrated).

**Fifth, the trust erosion is accelerating.** Rock Health's decline from 25% to 14% willingness to share with health tech companies over three years, combined with Deloitte's finding that benefits-outweigh-risks sentiment hit its lowest recorded level in 2025, suggests structural demand growth for privacy-first alternatives — if they can achieve the visibility and usability to compete with incumbents.

**Notable data gaps remain:** No study directly quantifies willingness to pay for a privacy-first period tracker. No analytics firm tracks downloads of the three most private apps (Euki, Drip, Periodical). No longitudinal data exists on whether the Dobbs-driven switching was sustained. And no confirmed case of period app data being subpoenaed has materialized, leaving the core privacy threat hypothetical — a factor that may explain why most users ultimately stayed with their existing apps.