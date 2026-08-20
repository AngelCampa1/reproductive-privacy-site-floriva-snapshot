# Reproductive health data after Dobbs: a fractured legal landscape

**No prosecutor has subpoenaed period tracker app data in any documented U.S. abortion case — but the legal infrastructure to do so exists in at least 14 states, and it is almost entirely unprotected by federal law.** The post-Dobbs legal landscape for reproductive health data privacy is defined by a widening gap: the Biden-era HIPAA Reproductive Privacy Rule was vacated by a federal court in June 2025, federal legislation remains stalled, and the FTC's enforcement posture has softened under the Trump administration. Meanwhile, a patchwork of state laws — led by Washington, California, Connecticut, Nevada, and Virginia — provides meaningful but geographically inconsistent protections. The most dangerous vector is not app subpoenas but the **data broker loophole**: commercially available location and health data that law enforcement can purchase without a warrant, bypassing all constitutional and statutory safeguards. This report maps the complete legal terrain across all relevant dimensions as of early 2026.

---

## No prosecutor has used period tracker data, but digital evidence is already in play

Despite widespread post-Dobbs alarm about period tracking apps, **no documented case exists in which prosecutors have subpoenaed or obtained cycle-tracking app data** in an abortion-related prosecution. Jake Laperruque of the Center for Democracy and Technology confirmed as recently as July 2024: "There haven't been any cases where a menstrual tracking app's data has been subpoenaed yet." No major app company — Flo, Clue, Glow, or others — has publicly reported receiving a law enforcement request for reproductive health data.

However, **other forms of digital evidence have proven central to prosecutions**. The defining case is *State v. Celeste Burgess & Jessica Burgess* (Madison County, Nebraska, 2022–2023), where Norfolk Police obtained Facebook Messenger messages via search warrant served on Meta. The messages showed a mother and daughter discussing abortion pills, dosage, and plans to "burn the evidence." Celeste Burgess received **90 days in jail**; Jessica Burgess received **two years in prison**. Critically, the warrants were issued before Dobbs and did not mention abortion — they were styled as homicide investigation warrants, and Meta complied. This case demonstrated that private messaging platforms, not health apps, are the primary digital evidence vector under current prosecutorial practice.

Pre-Dobbs cases reinforce this pattern. In *Latice Fisher* (Mississippi, 2018), prosecutors cited internet search history — "buy abortion pills, mifeprisone online" — found on a voluntarily surrendered iPhone. In *Purvi Patel* (Indiana, 2015), text messages about ordering abortion pills were central to a 20-year sentence. In both cases, the evidence came from communications, not dedicated health apps. The Center for American Progress documented **210 pregnancy-related prosecutions** in the year following Dobbs (June 2022–June 2023), the highest single-year total ever recorded, though most relied on tips from healthcare workers, family members, or partners rather than digital surveillance.

Two additional developments merit close attention. In *Silva v. Noyola* (Galveston County, Texas, 2023–2024), a man sued his ex-wife's friends under Texas's wrongful death statute using screenshots of text messages about obtaining abortion pills — represented by Jonathan Mitchell, architect of SB 8. The Texas Supreme Court blocked his attempt to depose his ex-wife, with two conservative justices calling his behavior "disgracefully vicious harassment," and the case settled in October 2024 with no payment. Separately, Texas AG Paxton's December 2024 lawsuit against a New York physician for prescribing abortion pills via telemedicine (*Paxton v. Carpenter*) is now the **first direct test of interstate shield laws**, with a New York court dismissing the enforcement attempt in October 2025.

---

## Subpoena risk is real in 14 states with criminal abortion penalties

The legal exposure for period tracker data is concentrated in **14 states** where abortion carries criminal penalties that trigger full prosecutorial subpoena power:

| State | Criminal Penalty | Max Sentence | Targets Patient? |
|-------|-----------------|--------------|-----------------|
| Alabama | Felony | 99 years | Providers only |
| Arkansas | Felony | 10 years / $100K | Providers only |
| Idaho | Felony | 2–5 years | Providers + bounty law |
| Indiana | Felony | 1–6 years | Providers only |
| Kentucky | Class D Felony | 1–5 years | Providers only |
| Louisiana | Hard labor | 1–10 years | Providers only |
| Mississippi | Felony | 10 years | Providers only |
| Missouri | Class B Felony | 5–15 years | Providers only |
| North Dakota | Class C Felony | 5 years | Providers only |
| Oklahoma | Felony | 10 years + bounty | Providers only |
| South Dakota | Class 6 Felony | 2 years | Providers only |
| Tennessee | Class C Felony | 3–15 years | Providers only |
| Texas | 1st Degree Felony | 5 years–life + SB 8/HB 7 bounties | Providers; civil bounties target "aiders" |
| West Virginia | Felony | 3–10 years | Providers only |

While most bans target providers rather than patients, prosecutors have used alternative statutes — concealing a death, abuse of a corpse, wrongful death — to reach patients indirectly, as the Burgess case demonstrated. Texas's expanding bounty framework (SB 8 in 2021 at $10,000; **HB 7 in 2025 at $100,000 minimum** for medication abortion) creates a distinct civil discovery pathway where private plaintiffs can compel production of digital evidence without prosecutorial involvement.

**The core legal vulnerability** is that period tracker data falls entirely outside HIPAA. The apps are not "covered entities" — they do not provide healthcare services or operate as health plans. A ClearDATA Harris Poll found **81% of respondents mistakenly believed their health app data was HIPAA-protected**. For data stored on company servers (Flo, Glow, Ovia), law enforcement can obtain it through a warrant, subpoena, or court order served on the company. For data stored on-device (Apple Health with encryption), a warrant is required, and end-to-end encryption may render the data inaccessible even to the company.

The third-party doctrine — under *Smith v. Maryland* (1979) — holds that information voluntarily shared with third parties loses Fourth Amendment protection. *Carpenter v. United States* (2018) carved out an exception for cell-site location data, with the Court finding a "world of a difference" between bank records and the "exhaustive chronicle" of location information. Legal scholars argue convincingly that *Carpenter*'s logic extends to reproductive health app data — intimate, comprehensive, and generated through routine use — but **no court has directly ruled on this question**. The argument remains untested.

**Virginia became the first state** to specifically prohibit search warrants for menstrual data stored on apps or electronic devices (SB 16, effective July 2024), after a failed 2023 attempt was blocked by the Youngkin administration. No other state has enacted a provision this targeted.

---

## Six states lead with specific reproductive data privacy protections

A small group of states has enacted laws explicitly protecting menstrual and reproductive health data. These laws are the most meaningful legal barriers against data exploitation in the current environment.

**Washington's My Health My Data Act** (HB 1155, signed April 27, 2023) is the gold standard. It applies to any entity doing business in Washington or targeting Washington consumers — with **no minimum size threshold**, unlike every other comprehensive U.S. privacy law. Its definition of "consumer health data" explicitly encompasses menstrual cycle data, fertility data, pregnancy data, reproductive health information, and crucially, **data inferred from non-health sources through algorithms**. The law requires opt-in consent for collection or sharing, mandates a standalone consumer health data privacy policy, bans geofencing within **2,000 feet** of healthcare facilities, and grants consumers robust deletion rights. Its most powerful feature is a **private right of action** under Washington's Consumer Protection Act, with potential treble damages capped at $25,000 per person. The first class action — *Maxwell v. Amazon* (W.D. Wash., filed February 2025) — alleges Amazon's advertising SDK harvested location data revealing healthcare facility visits from tens of millions of users.

**California** has layered multiple protections. **AB 254** (signed September 2023) amends the Confidentiality of Medical Information Act to specifically cover "reproductive or sexual health application information," explicitly listing menstrual cycle data, fertility, pregnancy, hormone levels, and algorithmic inferences. It makes any business offering a reproductive health digital service a "provider of health care" subject to CMIA requirements — carrying criminal penalties for violations. **AB 1242** (2022) prohibits California courts from issuing electronic surveillance orders related to abortion and bars California corporations from complying with out-of-state abortion-related subpoenas. **AB 352** (2023) requires EHR systems to enable privacy-enhancing features for reproductive health data. **AB 45** (2025) bans geolocation collection near family planning centers.

**Connecticut** (SB 3/Public Act 23-56, enacted June 2023) amended its comprehensive privacy law to add consumer health data — including reproductive/sexual health data — as "sensitive data" requiring opt-in consent, and bans geofencing within **1,750 feet** of reproductive health facilities. **Nevada** (SB 370, effective March 2024) mirrors Washington's framework but with no private right of action and a narrower, use-based definition of consumer health data. **Virginia** (SB 754, signed March 2025) amends its Consumer Protection Act to prohibit obtaining, disclosing, or selling reproductive/sexual health information without consent, with one of the most detailed definitions in the country — specifically listing menstruation, basal temperature, cramps, discharge, and hormone levels. It includes a private right of action ($500–$1,000 per violation). **Maryland** (MODPA, effective October 2025) adopted a "strictly necessary" standard for processing sensitive health data that is more restrictive than typical opt-in consent.

**New York** came close but fell short: the New York Health Information Privacy Act (S929) passed the legislature in January 2025 but was **vetoed by Governor Hochul in December 2025**. A revised version (S9269) was introduced in the 2026 session. However, New York's constitutional Proposition One (November 2024) amended the state constitution to protect against discrimination based on reproductive healthcare decisions, and existing shield provisions (HMH Part U, 2023) ban geofencing near healthcare facilities and prohibit companies from complying with out-of-state reproductive health data warrants.

---

## States with abortion restrictions and no data protections form a danger zone

The intersection of criminal abortion penalties and absent data privacy protections creates acute vulnerability in a cluster of states. **Alabama, Arkansas, Idaho, Louisiana, Mississippi, Missouri, North Dakota, Oklahoma, South Dakota, and West Virginia** have near-total abortion bans, no comprehensive data privacy law, and no shield law. In these states, prosecutors face minimal legal barriers to obtaining reproductive health data through standard subpoenas, court orders, or data broker purchases. Georgia and South Carolina (both with 6-week bans) are similarly unprotected.

Even some states with general data privacy laws offer hollow protection in this context. Texas enacted a comprehensive privacy law (TDPSA, effective July 2024) that classifies health data as sensitive and requires opt-in consent — but its aggressive abortion enforcement regime (SB 8, HB 7, and the AG's cross-state litigation posture) means the privacy law provides no practical shield against state-initiated investigations. Kentucky's comprehensive privacy law (effective January 2026) includes health data protections but nothing reproductive-specific.

No state has enacted legislation explicitly titled to expand prosecutor access to health data. However, several mechanisms effectively accomplish this: Texas's expanding bounty laws (HB 7's **$100,000 minimum** for medication abortion, effective December 2025, with the first suit filed February 2026 against a California doctor); Idaho's citizen bounty law; and the coalition of **15 Republican attorneys general** who challenged and ultimately helped kill the federal HIPAA Reproductive Privacy Rule. Texas led the lawsuit (*Purl v. HHS*, N.D. Tex.) that resulted in the rule's nationwide vacatur in June 2025, and HHS declined to appeal, effectively abandoning the regulation.

---

## Federal protections have collapsed; legislation is stalled

The federal protective framework has eroded dramatically between 2024 and 2026. The **HIPAA Privacy Rule to Support Reproductive Health Care Privacy** — finalized April 22, 2024, which would have prohibited disclosure of protected health information for investigating lawful reproductive healthcare and required attestations from requesters — was **vacated nationwide on June 18, 2025** by Judge Matthew Kacsmaryk in *Purl v. U.S. Department of Health and Human Services* (N.D. Tex., No. 2:24-cv-00228-Z). The court found HHS exceeded its statutory authority and invoked the major questions doctrine. HHS declined to appeal by the August 2025 deadline, and the Fifth Circuit dismissed proposed intervenors' appeal in September 2025. Covered entities have reverted to pre-2024 HIPAA baseline requirements. Biden-era executive orders (EO 14076, EO 14079/14101) directing HHS and FTC action were **revoked by President Trump on January 24, 2025**.

The **My Body My Data Act** has been introduced in every Congress since 2022 — currently as H.R. 3916 and S. 2029 in the 119th Congress, sponsored by Rep. Sara Jacobs (D-CA) and Sen. Mazie Hirono (D-HI) with 99 House and 19 Senate co-sponsors. The bill would impose strict data minimization requirements for reproductive health information (including menstrual data, explicitly), grant rights of access, correction, and deletion, preserve stronger state laws, and establish FTC enforcement plus a private right of action ($100–$1,000/day). GovTrack estimates a **2% chance** of clearing committee and 0% chance of enactment. Other stalled federal proposals include the **Health and Location Data Protection Act** (Sen. Warren), which would ban data brokers from selling location and health data, and the **Fourth Amendment Is Not For Sale Act** (Sen. Wyden, bipartisan), which would require court orders for government purchases of broker data — the latter **passed the House 219–199** in April 2024 but died in the Senate.

The one surviving federal tool is the FTC's **Health Breach Notification Rule**, updated July 2024, which now explicitly covers health apps and defines "breach" to include unauthorized disclosures (not just cyberattacks), with coverage for fertility, sexual health, and inferred health data. However, under FTC Chair Andrew Ferguson (appointed by Trump), with only two commissioners and three vacancies, enforcement posture has shifted significantly. Legal experts describe 2025 as "a relatively quiet year" for FTC health data enforcement, with the agency pulling back from the aggressive Section 5 "unfairness" theories used under Chair Lina Khan.

---

## The app ecosystem ranges from architecturally secure to deeply compromised

Major period tracking apps occupy a wide spectrum of data protection, with the fundamental dividing line being **architecture** (on-device vs. cloud storage) rather than policy promises.

**Flo Health** (48+ million monthly active users, ~200 million downloads) stores data on cloud servers. The FTC's 2021 settlement revealed Flo shared menstrual cycle dates, pregnancy status, and health symptoms with Facebook, Google, and Flurry despite privacy promises — triggered by a 2019 Wall Street Journal investigation. Flo launched "Anonymous Mode" post-Dobbs, which severs the link between health data and identity, but it requires a paid subscription (~$4.99/month), is not enabled by default, and **data still resides on Flo's servers** where it remains subject to legal process. A subsequent class action (*Frasco v. Flo Health*) yielded a **$59.5 million combined settlement** from Flo ($8M) and Google ($48M), with a jury finding Meta liable for violating California privacy law.

**Clue** (Berlin-based, BioWink GmbH) benefits from the strongest structural protection: data stored on **EU servers governed by GDPR**. Its co-CEOs stated unequivocally post-Dobbs: "We will never turn your private health data over to any authority that could use it against you... If we are subpoenaed by any authority demanding access to your data, we will not comply." Under European law, no U.S. court can override GDPR protections.

**Natural Cycles** (Swedish-based, FDA-cleared contraceptive) launched "NC° Secure" with a "Go Anonymous" feature separating identifying information from fertility data. However, a **December 2024 class action** alleged the app embedded hidden tracking technologies from Mixpanel, Google, and TikTok that transmitted reproductive data to third parties — the case is ongoing.

**Glow** has the worst documented privacy record: a 2020 California AG settlement ($250,000) for failing to safeguard health data, a 2024 security bug exposing personal data of all **25 million users**, and a privacy policy that Mozilla's *Privacy Not Included* found to be "easily shown to be false" regarding data sharing claims.

**Apple Health** offers the strongest architectural protection for U.S.-based users: cycle tracking predictions are processed on-device, and iCloud-synced health data is **end-to-end encrypted** when two-factor authentication is enabled, meaning Apple itself cannot read the data. **Ovia Health** (owned by Labcorp) presents the unique risk of employer-sponsored versions that share aggregated data — pregnancy rates, risk levels, return-to-work timing — with employers, creating re-identification risks in small workforces. Only Ovia's enterprise version is HIPAA-covered; the consumer version is not.

The **data broker ecosystem** represents the most acute systemic risk. In May 2022, Vice/Motherboard purchased a week of location data for **600+ Planned Parenthood locations for $160** from SafeGraph. The Veritas Society (Wisconsin Right to Life) used Near Intelligence's geofencing of 600 clinics across 48 states to deliver **14.3 million anti-abortion ads** in Wisconsin alone in 2020. Kochava sold "Expecting Parents" audience segments derived from fertility app users. A Gizmodo investigation identified **32+ data brokers** trafficking in pregnancy-related data through LiveRamp. Despite FTC actions against Kochava (settled February 2026 with a two-year "privacy block"), X-Mode/Outlogic, InMarket, Mobilewalla, and Gravy Analytics (which processed **17 billion signals/day** from ~1 billion devices), the broader ecosystem remains largely intact.

---

## 22 states plus D.C. have shield laws, but constitutional tests are pending

Shield laws — which block interstate enforcement of abortion-related legal process — represent the frontline defense for reproductive health data. As of early 2026, **22 states and D.C.** have enacted some form of shield law. The strongest versions (California, New York, Washington, Massachusetts, Illinois) specifically prohibit state courts from issuing or domesticating out-of-state subpoenas for reproductive health information, bar corporations from complying with out-of-state warrants, and prevent state agencies from cooperating with investigations. Massachusetts's "Shield 2.0" (August 2025) explicitly prohibits electronic communication service providers from complying with out-of-state reproductive health legal process.

The critical open question is constitutional. In *Paxton v. Carpenter*, Texas obtained a default judgment ($113,000+) against a New York physician — and a New York court dismissed the enforcement attempt in October 2025 on shield-law grounds. However, **15+ Republican attorneys general** have argued that shield laws violate the Full Faith and Credit Clause and the Extradition Clause, and this issue is **widely expected to reach the Supreme Court**. Separately, Dormant Commerce Clause challenges to state data privacy laws remain theoretically possible, though a Fordham Law Review analysis concluded that state shield laws would likely survive Pike balancing given the legitimate local interest in consumer data privacy.

---

## Six critical legal questions remain unresolved

**First**, whether *Carpenter v. United States* extends to health app data. The Court's emphasis on "pervasive and revealing" data and "involuntary" generation parallels reproductive health tracking, but no court has tested this. The distinction — that users input health data more "voluntarily" than cell-site data is generated — provides prosecutors an argument against extension.

**Second**, whether the Full Faith and Credit Clause invalidates state shield laws. The *Paxton v. Carpenter* litigation is a bellwether, likely headed to federal courts and eventually the Supreme Court. The outcome will determine whether data protections in shield-law states can withstand enforcement demands from ban states.

**Third**, whether AI-based pregnancy inference from non-reproductive data can be regulated. No federal law restricts algorithmic determination of pregnancy status from purchasing patterns, location data, or web activity. The FTC's updated Health Breach Notification Rule covers "health information inferred from" other data, but enforcement under the current administration is uncertain.

**Fourth**, whether the Stored Communications Act can be amended to cover reproductive health data. The proposed Reproductive Data Privacy and Protection Act (H.R. 7841, 118th Congress) would have required sworn statements that reproductive health information would not be used for prosecution, but it was not enacted.

**Fifth**, whether compelled phone decryption can reach health app data. Courts remain split on whether providing a passcode is "testimonial" (protected by the Fifth Amendment) or akin to providing a physical key. For health data stored in end-to-end encrypted apps, this distinction is dispositive.

**Sixth**, the constitutional status of informational privacy for reproductive data. *Whalen v. Roe* (1977) recognized a constitutional interest in "avoiding disclosure of personal matters," but lower courts are deeply split on its scope. After Dobbs eliminated the substantive due process right to abortion, *Whalen* may be one of the few remaining constitutional arguments — but no court has applied it to reproductive health app data in the post-Dobbs context.

---

## Conclusion

The legal landscape for reproductive health data privacy is defined by **structural asymmetry**: states with the strongest motivation to access this data have the fewest barriers to doing so, while states with robust protections have the least interest in enforcement. The fact that no prosecutor has yet subpoenaed period tracker data should not be read as safety — the Burgess case demonstrated that prosecutors reach for the digital evidence that is easiest to obtain (messages and search history), and the data broker ecosystem makes location data cheaper and faster than any subpoena. The six states with specific reproductive data protections (Washington, California, Connecticut, Nevada, Virginia, Maryland) cover approximately **100 million Americans**; the remaining states — including every one with a criminal abortion ban — offer minimal or no protection. Federal law provides no floor. The HIPAA Reproductive Privacy Rule is dead, the My Body My Data Act is effectively dead, and the FTC has retreated. The most consequential near-term developments will be the Supreme Court's eventual resolution of shield-law constitutionality, the first judicial test of *Carpenter* applied to health app data, and whether the data broker loophole is closed by legislation or remains the path of least resistance for surveillance of reproductive decisions.