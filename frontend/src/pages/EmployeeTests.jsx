import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Tag, Button, Typography, Space, Empty, Spin } from 'antd'
import { ClockCircleOutlined, CalendarOutlined, LogoutOutlined, CheckCircleOutlined, CloseCircleOutlined, StopOutlined } from '@ant-design/icons'
import client from '../api/client'
import useAuthStore from '../store/authStore'

const { Title, Text } = Typography

function StatusTag({ status, score }) {
  if (status === 'passed') return <Tag icon={<CheckCircleOutlined />} color="success">Пройден — {score}%</Tag>
  if (status === 'failed') return <Tag icon={<CloseCircleOutlined />} color="error">Не зачтён — {score}%</Tag>
  if (status === 'expired') return <Tag icon={<StopOutlined />} color="default">Просрочен</Tag>
  return <Tag color="processing">Доступен</Tag>
}

export default function EmployeeTests() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    client.get('/employee/tests').then((r) => { setTests(r.data); setLoading(false) })
  }, [])

  function handleLogout() { logout(); navigate('/') }

  function actionButton(t) {
    if (t.status === 'available') return <Button type="primary" onClick={() => navigate(`/employee/tests/${t.test_id}/take`)}>Начать тест</Button>
    if (t.status === 'passed' || t.status === 'failed') return <Button onClick={() => navigate(`/employee/tests/${t.test_id}/result`)}>Просмотреть результат</Button>
    return <Button disabled>Недоступен</Button>
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 32px', background: 'inherit' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>{user?.first_name} {user?.last_name}</Title>
            <Text type="secondary">{user?.department}</Text>
          </div>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>Выйти</Button>
        </div>

        <Title level={4} style={{ marginBottom: 16 }}>Назначенные тесты</Title>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
        ) : tests.length === 0 ? (
          <Empty description="Нет доступных тестов. Обратитесь к специалисту отдела развития." />
        ) : (
          <Row gutter={[16, 16]}>
            {tests.map((t) => (
              <Col key={t.enrollment_id} xs={24} sm={12} lg={8}>
                <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }} bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t.training_title}</Text>
                  <Title level={5} style={{ marginTop: 0, marginBottom: 16, flex: 1 }}>{t.test_title}</Title>
                  <Space direction="vertical" size={6} style={{ marginBottom: 16 }}>
                    <Text type="secondary"><ClockCircleOutlined style={{ marginRight: 6 }} />Время: {t.time_limit_minutes} мин.</Text>
                    {t.deadline_date && (
                      <Text type="secondary"><CalendarOutlined style={{ marginRight: 6 }} />Дедлайн: {t.deadline_date}</Text>
                    )}
                    <Text type="secondary">Проходной балл: {t.passing_score}%</Text>
                  </Space>
                  <div style={{ marginBottom: 12 }}>
                    <StatusTag status={t.status} score={t.score} />
                  </div>
                  {actionButton(t)}
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  )
}
