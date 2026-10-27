// betterhouse Tenancy Agreement template (from the uploaded BetterHouse_Tenancy_Agreement.pdf).
const n = (v: unknown) => "NGN " + Number(v ?? 0).toLocaleString("en-NG");
const or = (v: unknown, f = "________________") => (v && String(v).trim()) || f;

export function buildAgreement(d: {
  date: Date; receiptId: string; reference: string;
  landlord: { name?: string | null; phone?: string | null; email?: string | null };
  tenant: { name?: string | null; email?: string | null; phone?: string | null; address?: string | null; idNumber?: string | null; nextOfKin?: string | null };
  property: { title?: string; address?: string; area?: string; city?: string; property_type?: string; bedrooms?: number; bathrooms?: number; amenities?: string[] };
  pay: { rent: number; caution_fee: number; agency_fee: number; agreement_fee: number; other_fees: number; platform_fee: number; total: number };
}) {
  const end = new Date(d.date); end.setFullYear(end.getFullYear() + 1);
  const f = (x: Date) => x.toLocaleDateString("en-GB");
  const p = d.property;
  return `BETTERHOUSE TENANCY AGREEMENT
A fair and balanced agreement between Landlord and Tenant
betterhouse receipt ID: ${d.receiptId} · Payment reference: ${d.reference}

SCHEDULE OF PARTICULARS
Date of Agreement: ${f(d.date)}
Landlord (full name): ${or(d.landlord.name)}
Landlord phone / email: ${or(d.landlord.phone)} / ${or(d.landlord.email)}
Tenant (full name): ${or(d.tenant.name)}
Tenant ID number: ${or(d.tenant.idNumber)}
Tenant address / phone / email: ${or(d.tenant.address)} / ${or(d.tenant.phone)} / ${or(d.tenant.email)}
Emergency contact of Tenant: ${or(d.tenant.nextOfKin)}
Premises: ${or(p.title)}, ${or(p.address, "")} ${or(p.area, "")} ${or(p.city, "")}
Description: ${or(p.property_type, "")} · ${p.bedrooms ?? 0} bedroom(s), ${p.bathrooms ?? 0} bathroom(s)${p.amenities?.length ? " · " + p.amenities.join(", ") : ""}
Start date / End date: ${f(d.date)} to ${f(end)} (start moves to key handover date if later)
Rent: ${n(d.pay.rent)} per year (paid in full through betterhouse escrow)
Security / caution deposit: ${n(d.pay.caution_fee)} (refundable)
Agency fee: ${n(d.pay.agency_fee)} · Agreement fee: ${n(d.pay.agreement_fee)} · Other charges: ${n(d.pay.other_fees)} · betterhouse service fee: ${n(d.pay.platform_fee)}
Total paid: ${n(d.pay.total)}
Notice period to end tenancy: 3 months (each party, see clause 15)

TERMS AND CONDITIONS
In these terms, "Landlord" and "Tenant" mean the persons named in the Schedule and "Premises" means the property described there. Each party agrees as follows.

1 PURPOSE AND FAIRNESS
1.1 This Agreement sets out the rights and duties of both parties. It is intended to be fair, clear and balanced, and is to be read that way.
1.2 Each party confirms that they have read and understood this Agreement, had the chance to ask questions and to take independent advice, and sign freely.
1.3 Where the law gives either party a right that this Agreement tries to reduce, the law prevails. The tenancy laws that apply to the location of the Premises (including the Lagos State Tenancy Law, where the Premises is in Lagos State) apply to this Agreement.

2 TERM
2.1 The Landlord lets and the Tenant takes the Premises for the term in the Schedule, starting on the start date.
2.2 If the Tenant stays on after the term with the Landlord's consent and keeps paying rent, the tenancy continues on the same terms as a periodic tenancy, running period to period. Either party may end it by giving notice under clause 15.

3 RENT AND PAYMENT
3.1 The Tenant shall pay the rent in the Schedule on or before each due date, through betterhouse or any other method both parties agree in writing.
3.2 The Landlord shall give a written or electronic receipt for every payment within 2 working days. The betterhouse receipt above is the receipt for this payment.
3.3 Rent paid in advance shall not exceed the amount allowed by law for this kind of tenancy. The Landlord shall not demand more than the lawful maximum.
3.4 The Landlord shall not increase the rent during the term. Any increase for a later period requires at least 3 months' written notice and the Tenant's written agreement, or any other process the law requires.

4 SECURITY DEPOSIT
4.2 The Landlord shall not use the deposit as rent for the final period unless the Tenant agrees in writing.
4.3 Within 21 days after the Tenant returns the Premises and hands back all keys, the Landlord shall refund the deposit, less lawful deductions. The Landlord shall give a written, itemised list of each deduction with receipts, quotes or other proof.
4.4 Fair wear and tear, normal ageing of paint and fittings, and faults the Landlord was responsible for repairing shall not be deducted.

5 UTILITIES AND CHARGES
5.1 Unless the Schedule states otherwise, the Tenant pays for electricity, water, internet, cooking gas and similar services used in the Premises, including prepaid meter tokens.
5.2 The Tenant shall pay any service or facility charge in the Schedule. The Landlord shall on request explain what the charge covers and shall provide those services.
5.3 The Landlord shall pay all rates, taxes, levies and ground charges on the property that the law places on an owner, and shall not pass them on to the Tenant unless clearly stated in the Schedule.
5.4 Neither party shall cut off, tamper with or restrict any utility or access to the Premises as a way of pressuring the other.

6 USE OF THE PREMISES
6.1 The Tenant shall use the Premises as a home for the permitted occupants only. No business may be run from the Premises without the Landlord's written consent, which shall not be unreasonably refused for low-impact work from home.
6.2 The Tenant shall not use the Premises for any unlawful activity, shall not store dangerous or illegal items, and shall not cause nuisance or annoyance to neighbours.
6.3 The Tenant may have guests. Guests staying more than 14 consecutive days require the Landlord's consent.

7 CONDITION AND HANDOVER
7.1 Before move-in, both parties shall complete the Handover Checklist in Annex A, noting the condition of the Premises, fixtures, meter readings and number of keys. Both shall sign it and keep a copy. Photos and videos taken on the date form part of the record.
7.2 If no checklist is signed, the Premises is treated as being in good condition, except for defects the Tenant reports in writing within 7 days of move-in.

8 LANDLORD'S OBLIGATIONS
8.2 The Tenant shall enjoy the Premises quietly and without interference. The Landlord shall not harass the Tenant, change the locks, remove the Tenant's belongings or take any self-help eviction step.
8.3 The Landlord shall keep the structure, roof, walls, drainage, plumbing, wiring, gates and any Landlord-supplied fixtures in good and safe repair, and shall attend to repair requests within a reasonable time: emergencies within 24 hours, other urgent repairs within 7 days, and routine repairs within 21 days.
8.4 If the Landlord fails to carry out an urgent repair after written notice and a reasonable time to act, the Tenant may have it done by a competent person and deduct the reasonable cost from the next rent, with receipts, after giving the Landlord 3 days' notice of that intention.
8.5 The Landlord shall keep common areas, security arrangements and approaches to the Premises in a safe condition where these are under the Landlord's control.

9 TENANT'S OBLIGATIONS
9.1 The Tenant shall pay rent and agreed charges on time, keep the Premises clean and in good order, and take reasonable care of the fixtures and fittings.
9.2 The Tenant shall report any damage, leak, electrical fault, pest or security problem promptly, in writing (message or email is enough).
9.3 The Tenant shall repair or pay for damage caused by the Tenant, permitted occupants or guests, other than fair wear and tear.
9.4 The Tenant shall obey reasonable house rules in Annex B, applicable estate or community rules, and the law.

10 ALTERATIONS
10.1 The Tenant shall not make structural changes, repaint in a permanent way, drill into load-bearing parts, or change locks without the Landlord's written consent.
10.2 Small changes that can be undone without damage (shelves, wall hangings with removable fixings, plug-in appliances) are allowed without consent.
10.3 The Landlord shall not unreasonably refuse consent for reasonable security upgrades, and any approved alterations shall be removed and repaired by the Tenant at the end of the tenancy unless the Landlord agrees to keep them.

11 SUBLETTING AND ASSIGNMENT
11.1 The Tenant shall not sublet, share for payment or assign the Premises, or part of it, without the Landlord's written consent.
11.2 The Landlord may sell or transfer the property, but any buyer takes it subject to this Agreement, and the Landlord shall tell the Tenant in writing and give the new owner's details.

12 ACCESS AND INSPECTION
12.1 The Landlord or an authorised person may enter the Premises to inspect it, carry out repairs, or show it to future tenants or buyers in the last 30 days of the tenancy.

13 INSURANCE, RISK AND LIABILITY
13.2 Neither party is liable for loss or damage caused by events beyond their control, such as fire, flood or natural disaster, unless caused by that party's negligence or breach of this Agreement.
13.3 Nothing in this Agreement removes a party's liability for death or personal injury caused by negligence, or for fraud.

14 DEFAULT AND REMEDIES
14.1 If the Tenant fails to pay rent within the grace period, the Landlord shall send a written reminder giving at least 7 days to pay.
14.2 If the Tenant seriously breaches any other term, the Landlord shall give written notice describing the breach and at least 14 days to fix it, where it can be fixed.
14.3 If the Landlord seriously breaches any term (including repairs, privacy or quiet enjoyment), the Tenant shall give written notice and a reasonable time to fix it.
14.4 If a breach remains unfixed after notice, the innocent party may end the tenancy on the notice allowed by law and claim any proven loss.
14.5 The Landlord may recover possession only by the lawful court process and the notices the law requires. Self-help eviction is not allowed.

15 ENDING THE TENANCY
15.1 Either party may end the tenancy at the end of the term by giving written notice of at least the period in the Schedule, and in any case not less than the minimum the law requires.
15.2 The Tenant may leave early on written notice if the Premises becomes unfit to live in through no fault of the Tenant. Rent stops from the date the Premises becomes unfit.
15.3 If the Tenant leaves early for any other reason, the Tenant remains liable for rent until the notice period ends or a replacement tenant approved by the Landlord moves in, whichever is earlier. The Landlord shall take reasonable steps to re-let the Premises quickly.
15.4 On leaving, the parties shall carry out a joint inspection, settle meter readings and unpaid sums, and complete the refund process in clause 4.

16 MUTUAL PROTECTIONS
16.1 Neither party shall discriminate against, harass or threaten the other or their household.
16.2 The Landlord shall not retaliate against the Tenant for lawfully reporting a defect or exercising any right under this Agreement or the law.
16.3 Each party shall treat personal information of the other as confidential and use it only for matters connected with this tenancy, or as the law requires.
16.4 Each party shall act honestly and in good faith, and shall respond to the other's messages within a reasonable time, usually 3 working days.

17 DISPUTE RESOLUTION
17.1 The parties shall first try to settle any dispute by talking, and if that fails, by mediation with a neutral mediator they both accept (including betterhouse mediation), or with a community or estate dispute resolution body.
17.2 If mediation does not settle the dispute within 30 days, either party may take it to a court or tribunal with authority over tenancy matters in the place where the Premises is located.
17.3 Neither party is stopped from seeking urgent court relief to protect their rights.

18 NOTICES
18.1 Notices shall be in writing and sent to the addresses in the Schedule, by hand, courier, email or a messaging app the parties use for this tenancy.
18.2 A notice is treated as received when delivered by hand, on the next working day after emailing or messaging with proof of sending, or 3 working days after courier posting.
18.3 Each party shall tell the other promptly if their contact details change.

19 GENERAL
19.1 This Agreement, with its Schedule and Annexes, is the whole agreement between the parties. Changes must be in writing and signed by both.
19.2 If any term is found unenforceable, the rest of the Agreement stays in force.
19.3 Delay or failure by a party to enforce a right is not a waiver of that right.
19.4 This Agreement is governed by the laws of the Federal Republic of Nigeria and the laws of the state where the Premises is located.
19.5 This Agreement may be signed in counterparts and electronically where the law permits. Each party receives a signed copy.

ANNEX A: HANDOVER CHECKLIST
Complete at move-in and again at move-out (Good / Fair / Poor, with notes and dated photos): Living room · Bedroom(s) · Kitchen · Bathroom / toilet · Doors, locks and windows · Electrical sockets and lights · Water supply and plumbing · Fans / AC / appliances supplied · Furniture supplied · Gate, fence, compound.

ANNEX B: HOUSE RULES
B1 Quiet hours as agreed with the Landlord. B2 Dispose of refuse in the place and manner agreed. B3 Parking as allowed by the compound. B4 Pets only with consent. B5 No smoking indoors. B6 Visitors follow estate or compound security rules.

SIGNATURES
By signing, each party confirms they have read, understood and agree to this Agreement.`;
}
