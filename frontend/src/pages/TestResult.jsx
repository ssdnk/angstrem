import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Typography, Space, Collapse, Tag, Spin, Alert } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import client from '../api/client'

const { Title, Text } = Typography

export default function TestResult() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    client.get(`/employee/tests/${testId}/result`)
      .then((r) => { setResult(r.data); setLoading(false) })
      .catch((e) => { setError(e.response?.data?.detail || 'Ошибка'); setLoading(false) })
  }, [testId])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 80 }}><Spin size="large" /></div>
  if (error) return <div style={{ maxWidth: 500, margin: '80px auto', padding: 24 }}><Alert type="error" message={error} /></div>

  const minutes = Math.floor((result.time_spent_seconds || 0) / 60)
  const passed = result.is_passed
  const scoreColor = passed ? '#389e0d' : '#cf1322'

  const collapseItems = result.question_results.map((qr, i) => ({
    key: i,
    label: (
      <Space>
        {qr.is_correct
          ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
          : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
        <Text>{i + 1}. {qr.question_text}</Text>
      </Space>
    ),
    children: (
      <Space direction="vertical" style={{ width: '100%' }}>
        {qr.answer_options.map((opt) => {
          const wasSelected = qr.selected_option_ids.includes(opt.id)
          const isCorrect = opt.is_correct
          const borderColor = isCorrect ? '#b7eb8f' : wasSelected ? '#ffa39e' : '#d9d9d9'
          const bg = isCorrect ? '#f6ffed' : wasSelected ? '#fff1f0' : undefined

          return (
            <div key={opt.id} style={{ padding: '8px 12px', borderRadius: 6, border: `1px solid ${borderColor}`, background: bg }}>
              <Space>
                {isCorrect
                  ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  : wasSelected
                  ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  : <span style={{ width: 14, display: 'inline-block' }} />}
                <Text>{opt.answer_text}</Text>
                {wasSelected && <Tag color={isCorrect ? 'success' : 'error'}>{isCorrect ? 'Ваш ответ — верно' : 'Ваш ответ — неверно'}</Tag>}
                {isCorrect && !wasSelected && <Tag color="success">Правильный ответ</Tag>}
              </Space>
            </div>
          )
        })}
      </Space>
    ),
  }))

  return (
    <div style={{ minHeight: '100vh', padding: '32px 16px', background: 'inherit' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Card style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 120, height: 120, borderRadius: '50%',
            margin: '0 auto 20px',
            border: `3px solid ${scoreColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: scoreColor,
          }}>
            {result.score}%
          </div>

          <Title level={3} style={{ color: scoreColor, margin: '0 0 16px' }}>
            {passed ? 'Тест зачтён' : 'Тест не зачтён'}
          </Title>

          <Space size="large" wrap>
            <div>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Правильных ответов</Text>
              <Text strong>{result.correct_count} из {result.total_questions}</Text>
            </div>
            <div>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Затрачено времени</Text>
              <Text strong>{minutes} мин.</Text>
            </div>
            <div>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Проходной балл</Text>
              <Text strong>{result.passing_score}%</Text>
            </div>
          </Space>

          <br />
          <Button icon={<ArrowLeftOutlined />} style={{ marginTop: 24 }} onClick={() => navigate('/employee/tests')}>
            К списку тестов
          </Button>
        </Card>

        <Card title="Разбор ответов">
          <Collapse items={collapseItems} />
        </Card>
      </div>
    </div>
  )
}
