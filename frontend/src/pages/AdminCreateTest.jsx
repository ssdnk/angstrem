import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, InputNumber, Switch, Button, Space, message, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import AdminLayout from '../components/layout/AdminLayout'
import client from '../api/client'

const { Title } = Typography

export default function AdminCreateTest() {
  const [params] = useSearchParams()
  const trainingId = params.get('training_id')
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  async function onFinish(values) {
    setSaving(true)
    try {
      const r = await client.post('/tests', { ...values, training_id: parseInt(trainingId), is_active: values.is_active ?? true })
      message.success('Тест создан')
      navigate(`/admin/tests/${r.data.id}/edit`)
    } catch (e) {
      message.error(e.response?.data?.detail || 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/trainings')}>Назад</Button>
        <Title level={4} style={{ margin: 0 }}>Создать тест</Title>
      </div>
      <Card style={{ maxWidth: 500 }}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ time_limit_minutes: 30, deadline_days: 5, passing_score: 70, is_active: true }}>
          <Form.Item name="title" label="Название теста" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="time_limit_minutes" label="Лимит времени (мин)" rules={[{ required: true }]}>
            <InputNumber min={5} max={180} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="deadline_days" label="Дней на прохождение (рабочих)" rules={[{ required: true }]}>
            <InputNumber min={1} max={30} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="passing_score" label="Проходной балл (%)" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_active" label="Активен" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} block>Создать тест и перейти к вопросам</Button>
        </Form>
      </Card>
    </AdminLayout>
  )
}
