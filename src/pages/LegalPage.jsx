import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'

const LEGAL_CONTENT = {
  terms: {
    title: '用户协议',
    sections: [
      {
        heading: '服务定位',
        body:
          '搭搭是一个用于发起和加入线下活动的即时拼局工具，核心目的是帮助用户围绕具体活动快速找到同行者，不提供婚恋撮合服务。',
      },
      {
        heading: '用户行为规范',
        body:
          '用户不得发布骚扰、色情、招嫖、交易、违法活动或任何与正常线下拼局无关的内容。平台有权对违规账号采取限流、封禁、拉黑、保留证据和配合调查等措施。',
      },
      {
        heading: '线下安全',
        body:
          '请优先选择公开场所见面，提前向朋友分享行程信息。平台会提供举报与拉黑工具，但无法替代用户的现场判断与个人安全责任。',
      },
      {
        heading: '评价与信用',
        body:
          '用户在活动结束后可基于真实经历进行评价。恶意差评、虚假投诉或刷分行为会影响账号使用权限。',
      },
    ],
  },
  privacy: {
    title: '隐私政策',
    sections: [
      {
        heading: '收集的信息',
        body:
          '我们会收集你在注册、发布活动、报名活动、上传头像与提交评价时主动提供的信息，以及必要的设备与日志信息用于安全审计。',
      },
      {
        heading: '信息用途',
        body:
          '这些信息用于完成账号认证、活动匹配、风险控制、投诉处理、内容审核与产品优化，不会用于与你的活动目的无关的公开展示。',
      },
      {
        heading: '信息展示范围',
        body:
          '昵称、头像、学校标签、活动历史与活动评价等信息可能向其他用户展示，用于帮助大家判断活动是否靠谱。',
      },
      {
        heading: '安全与删除',
        body:
          '你可以修改个人资料、删除自己发布的内容，并通过举报或联系客服申请处理异常信息。对涉及安全事件的数据，我们可能在法律允许范围内保留。',
      },
    ],
  },
}

export default function LegalPage() {
  const { type } = useParams()
  const content = useMemo(() => LEGAL_CONTENT[type] || LEGAL_CONTENT.terms, [type])

  return (
    <div>
      <Navbar title={content.title} showBack />
      <div className="container" style={{ paddingTop: 12, paddingBottom: 40 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {content.sections.map((section) => (
            <div key={section.heading}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{section.heading}</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: '#666' }}>{section.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
