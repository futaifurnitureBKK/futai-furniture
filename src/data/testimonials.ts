export type Testimonial = {
  id: string;
  images: string[];
  th: string;
  en: string;
  zh: string;
  tagTh: string;
  tagEn: string;
  tagZh: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "conference-table-01",
    images: ["/testimonials/r1.jpg", "/testimonials/r1-1.jpg"],
    th: "โต๊ะประชุมโค้งสั่งทำพิเศษ ติดตั้งหน้างานจริงให้ลูกค้าองค์กร พร้อมทีมช่างของฟูไท่ควบคุมงานทุกขั้นตอน",
    en: "Custom curved conference table, installed on-site for a corporate client by the Futai installation team.",
    zh: "定制弧形会议桌，富泰安装团队亲临现场为企业客户完成安装。",
    tagTh: "งานติดตั้งจริง",
    tagEn: "Real Installation",
    tagZh: "真实安装案例",
  },
];
