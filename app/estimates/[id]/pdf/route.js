import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/utils/supabase/server";
import { isAuthSkipEnabled } from "@/lib/auth-skip";
import { getCompany } from "@/lib/company";
import { buildQuoteView } from "@/lib/estimate-print";
import { describeDbError } from "@/lib/db-error";
import EstimatePdf from "@/lib/pdf/EstimatePdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function textResponse(message, status) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request, { params }) {
  if (isAuthSkipEnabled()) {
    return textResponse("開発用スキップ中のため PDF は作成できません。", 403);
  }

  const { id } = await params;
  const showLaborDetail = new URL(request.url).searchParams.get("detail") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `/estimates/${id}/pdf${showLaborDetail ? "?detail=1" : ""}`);
    return Response.redirect(login, 303);
  }

  const { data: estimate, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return textResponse(describeDbError(error, "pdf.estimates.select"), 500);
  if (!estimate) return textResponse("見積もりが見つかりません。", 404);

  const { data: materials, error: matError } = await supabase
    .from("estimate_materials")
    .select("*")
    .eq("estimate_id", id)
    .order("sort_order", { ascending: true });
  if (matError) return textResponse(describeDbError(matError, "pdf.materials.select"), 500);

  const company = getCompany();
  const view = buildQuoteView(estimate, materials, company, { showLaborDetail });

  try {
    const buffer = await renderToBuffer(
      <EstimatePdf estimate={estimate} company={company} view={view} />,
    );
    const filename = `見積書_${estimate.estimate_no || id.slice(0, 8)}.pdf`;
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="estimate.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[pdf.render]", e);
    return textResponse("PDF の作成に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
