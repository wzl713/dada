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
          '搭搭是一个用于发起和加入线下活动的即时拼局工具，核心目的是帮助用户围绕具体活动快速找到同行者，不提供婚恋撮合服务。平台仅提供信息撮合服务，不对线下个人行为承担担保责任。',
      },
      {
        heading: '用户行为规范',
        body:
          '用户不得发布骚扰、色情、招嫖、交易、违法活动或任何与正常线下拼局无关的内容。平台有权对违规账号采取限流、封禁、拉黑、保留证据和配合调查等措施。',
      },
      {
        heading: '线下安全',
        body:
          '请优先选择公开场所见面，提前向朋友分享行程信息。请勿向陌生人透露手机号、住址、证件号等隐私信息。平台会提供举报、拉黑与行为记录工具，但无法替代用户的现场判断与个人安全责任。',
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
          '我们会收集你在注册、发布活动、报名活动、上传头像、提交评价、举报、拉黑与确认出发时主动提供的信息，以及必要的设备与日志信息用于安全审计。手机号只用于平台内部追溯和账号安全，不会向其他用户展示。',
      },
      {
        heading: '信息用途',
        body:
          '这些信息用于完成账号认证、活动匹配、风险控制、投诉处理、内容审核与产品优化，不会用于与你的活动目的无关的公开展示。',
      },
      {
        heading: '信息展示范围',
        body:
          '昵称、头像、学校标签、信用等级、守约率、活动历史与活动评价等信息可能向其他用户展示，用于帮助大家判断活动是否靠谱。真实手机号不会对其他用户展示，前端只显示“已绑定手机号”标签。',
      },
      {
        heading: '安全与删除',
        body:
          '你可以修改个人资料、删除自己发布的内容，并通过举报或联系客服申请处理异常信息。对涉及安全事件的数据，我们可能在法律允许范围内保留。',
      },
    ],
  },
  safety: {
    title: '安全说明',
    sections: [
      {
        heading: '线下见面提醒',
        body:
          '首次见面建议选择商场、学校公共区域、运动场馆、门店前台等公共场所，不建议直接前往私人住宅、偏僻地点或临时变更到陌生地点。',
      },
      {
        heading: '行程告知',
        body:
          '建议提前把活动标题、时间、地点、发起人昵称和活动链接分享给朋友或同学。活动详情页提供“分享给朋友”按钮，可复制完整行程摘要。',
      },
      {
        heading: '隐私保护',
        body:
          '请勿向陌生人透露真实手机号、住址、证件号、支付密码、验证码等隐私信息。平台不会向其他用户展示你的真实手机号，只展示“已绑定手机号”标签。',
      },
      {
        heading: '异常处理',
        body:
          '如遇骚扰、诱导交易、临时变更危险地点、言语威胁或其他异常行为，请及时使用举报和拉黑功能，并保留聊天和活动信息作为处理依据。',
      },
      {
        heading: '免责声明',
        body:
          '平台仅提供活动信息发布与参与撮合服务，不对用户线下个人行为、活动履约、消费争议或人身财产损失承担担保责任。',
      },
    ],
  },
  community: {
    title: '内容规范',
    sections: [
      {
        heading: '允许发布的内容',
        body:
          '允许发布围绕具体行为的正常搭子活动，例如看电影、吃饭、运动、自习、徒步、展览、密室、剧本杀等。',
      },
      {
        heading: '禁止发布的内容',
        body:
          '禁止发布色情低俗、约炮暗示、骚扰、招嫖、赌博、违法交易、虚假引流、诱导转账、攻击辱骂或与正常线下活动无关的内容。',
      },
      {
        heading: '活动信息要求',
        body:
          '活动标题、时间、地点和见面点说明应尽量明确。不得故意隐藏真实意图，不得用普通活动包装商业推销、私下交易或危险活动。',
      },
      {
        heading: '违规处理',
        body:
          '平台可根据举报、行为记录和活动内容，对违规内容进行删除、限制发布、限制加入、拉黑建议或账号处理。内测阶段处理可能以人工核查为主。',
      },
    ],
  },
  delete: {
    title: '注销与数据删除说明',
    sections: [
      {
        heading: '资料修改',
        body:
          '你可以在“我的”页面修改昵称、头像、学校或常驻区域、简介和性别等基础资料。',
      },
      {
        heading: '内容删除',
        body:
          '你可以删除自己发布的活动。涉及安全事件、举报、拉黑和行为审计的记录，平台可能在法律允许范围和安全处理需要内保留一段时间。',
      },
      {
        heading: '账号注销',
        body:
          '内测阶段暂不提供自动注销入口。如需注销账号或删除个人数据，请联系开发者处理。正式上线前建议补充更清晰的客服邮箱或站内反馈入口。',
      },
      {
        heading: '手机号处理',
        body:
          '手机号仅用于账号登录、安全追溯和内部风控，不会展示给其他用户。注销或删除请求处理时，会一并评估手机号相关账号数据。',
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
