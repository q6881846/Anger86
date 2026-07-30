export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <h2 className="text-2xl font-bold text-vermilion-bright">页面不存在</h2>
      <p className="mt-3 text-sm text-text-muted">
        您访问的页面可能已被移动或删除，请返回首页重新进入。
      </p>
    </div>
  );
}
