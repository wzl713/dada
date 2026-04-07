import { useNavigate } from 'react-router-dom'

const LINKS = [
  { label: '用户协议', path: '/legal/terms' },
  { label: '隐私政策', path: '/legal/privacy' },
  { label: '安全说明', path: '/legal/safety' },
  { label: '内容规范', path: '/legal/community' },
  { label: '注销与删除', path: '/legal/delete' },
]

export default function ComplianceFooter() {
  const navigate = useNavigate()

  return (
    <footer className="compliance-footer">
      <div className="compliance-footer-title">Dada 搭搭 · 内测版</div>
      <div className="compliance-footer-desc">
        平台仅提供信息撮合服务，首次见面建议选择公共场所，并提前告知朋友行程。
      </div>
      <div className="compliance-footer-links">
        {LINKS.map((item) => (
          <button key={item.path} type="button" onClick={() => navigate(item.path)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="compliance-footer-record">
        ICP 备案号：备案完成后展示 · 公安联网备案：如依法需要，开站后按要求办理
      </div>
    </footer>
  )
}
