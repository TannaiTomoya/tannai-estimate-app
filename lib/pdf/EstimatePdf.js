import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatJaDate, formatYenPlain } from "@/lib/estimate-print";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const FONT = "BIZUDPGothic";

Font.register({
  family: FONT,
  fonts: [
    { src: path.join(FONT_DIR, "BIZUDPGothic-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "BIZUDPGothic-Bold.ttf"), fontWeight: 700 },
  ],
});

// 日本語は空白で区切られないため、CJK を含む語は1文字ずつ改行可能にする（ハイフンは入れない）
const CJK = /[\u3000-\u30ff\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/;
Font.registerHyphenationCallback((word) =>
  CJK.test(word) ? Array.from(word).flatMap((ch) => [ch, ""]) : [word],
);

const COL = { name: "44%", qty: "10%", unit: "8%", price: "18%", amount: "20%" };
const LINE = "#999";

const s = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontSize: 10,
    color: "#111",
    paddingVertical: "15mm",
    paddingHorizontal: "15mm",
    lineHeight: 1.5,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: "7mm",
  },
  head: { flexDirection: "row", justifyContent: "space-between", marginBottom: "5mm" },
  headLeft: { flexGrow: 1, paddingRight: "6mm" },
  customer: {
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingBottom: 2,
    marginBottom: "3mm",
    width: "70mm",
  },
  headRight: { width: "80mm", fontSize: 9 },
  metaRight: { textAlign: "right" },
  issuer: { marginTop: "4mm" },
  issuerName: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
  staff: { flexDirection: "row", alignItems: "center", marginTop: "3mm" },
  staffLabel: { color: "#444", marginRight: "2mm" },
  staffName: {
    width: "26mm",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    fontSize: 10,
    paddingHorizontal: 2,
    marginRight: "2mm",
  },
  stamp: {
    width: "12mm",
    height: "12mm",
    borderRadius: "6mm",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#999",
    alignItems: "center",
    justifyContent: "center",
  },
  stampText: { fontSize: 6, color: "#bbb" },
  metaRow: { flexDirection: "row", marginBottom: 3 },
  metaTh: { width: "22mm", color: "#444" },
  metaTd: { flex: 1 },
  table: { marginTop: "6mm", borderTopWidth: 2, borderTopColor: "#111" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE },
  trLast: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: "#111" },
  thRow: {
    flexDirection: "row",
    backgroundColor: "#f1f3f5",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  th: { paddingVertical: "2.2mm", paddingHorizontal: "1.5mm", fontWeight: 700, textAlign: "center" },
  td: { paddingVertical: "2.4mm", paddingHorizontal: "2mm" },
  name: { fontWeight: 700 },
  detail: { fontSize: 8.5, color: "#555", fontWeight: 400, marginTop: 1 },
  num: { textAlign: "right", fontSize: 11 },
  unit: { textAlign: "center" },
  sums: { width: "84mm", marginLeft: "auto" },
  sumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: "2mm",
    paddingHorizontal: "2mm",
  },
  sumValue: { fontSize: 11 },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f1f3f5",
    borderBottomWidth: 2,
    borderBottomColor: "#111",
    paddingVertical: "2mm",
    paddingHorizontal: "2mm",
  },
  grandText: { fontSize: 13, fontWeight: 700 },
  note: {
    marginTop: "6mm",
    borderWidth: 1,
    borderColor: "#bbb",
    paddingVertical: "2.5mm",
    paddingHorizontal: "3mm",
    fontSize: 9,
  },
  noteLabel: { fontWeight: 700, marginBottom: 2 },
});

function MetaRow({ label, value }) {
  return (
    <View style={s.metaRow}>
      <Text style={s.metaTh}>{label}</Text>
      <Text style={s.metaTd}>{value}</Text>
    </View>
  );
}

export default function EstimatePdf({ estimate, company, view }) {
  const { lines, note, taxPercent, validDays, staffName } = view;
  const telFax = [
    company.tel ? `TEL ${company.tel}` : "",
    company.fax ? `FAX ${company.fax}` : "",
  ]
    .filter(Boolean)
    .join("　");

  return (
    <Document title={`御見積書 ${estimate.estimate_no || ""}`} author={company.name || ""}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>御見積書</Text>

        <View style={s.head}>
          <View style={s.headLeft}>
            <Text style={s.customer}>{estimate.customer_name} 御中</Text>
            <Text>下記のとおりお見積り申し上げます。</Text>
          </View>
          <View style={s.headRight}>
            {estimate.estimate_no ? (
              <Text style={s.metaRight}>見積番号: {estimate.estimate_no}</Text>
            ) : null}
            <Text style={s.metaRight}>見積日: {formatJaDate(estimate.estimate_date)}</Text>
            {estimate.valid_until ? (
              <Text style={s.metaRight}>
                有効期限: {formatJaDate(estimate.valid_until)}
                {validDays != null && validDays > 0 ? `（見積日より${validDays}日間）` : ""}
              </Text>
            ) : null}
            <View style={s.issuer}>
              {company.name ? <Text style={s.issuerName}>{company.name}</Text> : null}
              {company.representative ? <Text>{company.representative}</Text> : null}
              {company.postalCode ? <Text>〒{company.postalCode}</Text> : null}
              {company.address ? <Text>{company.address}</Text> : null}
              {telFax ? <Text>{telFax}</Text> : null}
              {company.invoiceNumber ? <Text>登録番号 {company.invoiceNumber}</Text> : null}
              <View style={s.staff}>
                <Text style={s.staffLabel}>担当者</Text>
                <Text style={s.staffName}>{staffName}</Text>
                <View style={s.stamp}>
                  <Text style={s.stampText}>印</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <MetaRow label="件　名" value={estimate.title} />
        {estimate.work_description ? (
          <MetaRow label="作業内容" value={estimate.work_description} />
        ) : null}
        {estimate.work_location ? <MetaRow label="作業場所" value={estimate.work_location} /> : null}
        <MetaRow
          label="納　期"
          value={estimate.delivery_date ? formatJaDate(estimate.delivery_date) : "別途ご相談"}
        />

        <View style={s.table}>
          <View style={s.thRow} fixed>
            <Text style={[s.th, { width: COL.name }]}>品名</Text>
            <Text style={[s.th, { width: COL.qty }]}>数量</Text>
            <Text style={[s.th, { width: COL.unit }]}>単位</Text>
            <Text style={[s.th, { width: COL.price }]}>単価</Text>
            <Text style={[s.th, { width: COL.amount }]}>金額</Text>
          </View>
          {lines.map((line, i) => (
            <View
              key={`${line.name}-${i}`}
              style={i === lines.length - 1 ? s.trLast : s.tr}
              wrap={false}
            >
              <View style={[s.td, { width: COL.name }]}>
                <Text style={s.name}>{line.name}</Text>
                {line.detail ? <Text style={s.detail}>{line.detail}</Text> : null}
              </View>
              <Text style={[s.td, s.num, { width: COL.qty }]}>{line.quantity}</Text>
              <Text style={[s.td, s.unit, { width: COL.unit }]}>{line.unit}</Text>
              <Text style={[s.td, s.num, { width: COL.price }]}>
                {line.unitPrice == null ? "—" : formatYenPlain(line.unitPrice)}
              </Text>
              <Text style={[s.td, s.num, { width: COL.amount }]}>
                {formatYenPlain(line.amount)}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.sums} wrap={false}>
          <View style={s.sumRow}>
            <Text>小計（税抜）</Text>
            <Text style={s.sumValue}>¥{formatYenPlain(estimate.subtotal)}</Text>
          </View>
          <View style={s.sumRow}>
            <Text>消費税（{taxPercent}%）</Text>
            <Text style={s.sumValue}>¥{formatYenPlain(estimate.tax_amount)}</Text>
          </View>
          <View style={s.grandRow}>
            <Text style={s.grandText}>合計（税込）</Text>
            <Text style={s.grandText}>¥{formatYenPlain(estimate.total_with_tax)}</Text>
          </View>
        </View>

        {note ? (
          <View style={s.note} wrap={false}>
            <Text style={s.noteLabel}>備考</Text>
            <Text>{note}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
