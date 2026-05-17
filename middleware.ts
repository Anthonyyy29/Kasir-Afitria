import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/produk/:path*",
    "/pelanggan/:path*",
    "/laporan/:path*",
    "/pengguna/:path*",
    "/kasir/:path*",
    "/api/produk/:path*",
    "/api/pelanggan/:path*",
    "/api/transaksi/:path*",
    "/api/laporan/:path*",
    "/api/kategori/:path*",
    "/api/sub-kategori/:path*",
    "/api/satuan/:path*",
    "/api/warna/:path*",
    "/api/ukuran/:path*",
    "/api/varian/:path*",
    "/api/users/:id",
  ],
};
