import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Form, Input, InputNumber, Switch, Button, Space, Divider,
  Select, Radio, Checkbox, message, Typography, Popconfirm, Spin, Alert, Tag
} from 'antd'
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import AdminLayout from '../components/layout/AdminLayout'
import client from '../api/client'

const { Title, Text } = Typography

export default function AdminTestEditor() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const [test, setTest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [settingsForm] = Form.useForm()

  useEffect(() => { loadTest() }, [testId])

  async function loadTest() {
    try {
      const r = await client.get(`/tests/${testId}`)
      setTest(r.data)
      settingsForm.setFieldsValue({
        title: r.data.title,
        time_limit_minutes: r.data.time_limit_minutes,
        deadline_days: r.data.deadline_days,
        passing_score: r.data.passing_score,
        is_active: r.data.is_active,
      })
    } catch {
      setError('Тест не найден')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings(values) {
    setSaving(true)
    try {
      await client.put(`/tests/${testId}`, values)
      message.success('Настройки сохранены')
      await loadTest()
    } catch { message.error('Ошибка') } finally { setSaving(false) }
  }

  async function addQuestion() {
    try {
      await client.post(`/tests/${testId}/questions`, {
        question_text: 'Новый вопрос — введите текст',
        question_type: 'single',
        order_index: (test?.questions?.length || 0) + 1,
        answer_options: [
          { answer_text: 'Вариант А', is_correct: true, order_index: 1 },
          { answer_text: 'Вариант Б', is_correct: false, order_index: 2 },
          { answer_text: 'Вариант В', is_correct: false, order_index: 3 },
        ],
      })
      message.success('Вопрос добавлен')
      await loadTest()
    } catch { message.error('Ошибка') }
  }

  async function deleteQuestion(qId) {
    try {
      await client.delete(`/tests/${testId}/questions/${qId}`)
      await loadTest()
    } catch { message.error('Ошибка') }
  }

  async function saveQuestion(q, updatedData) {
    try {
      await client.put(`/tests/${testId}/questions/${q.id}`, updatedData)
      message.success('Вопрос сохранён')
      await loadTest()
    } catch { message.error('Ошибка сохранения') }
  }

  if (loading) return <AdminLayout><div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin size="large" /></div></AdminLayout>
  if (error) return <AdminLayout><Alert type="error" message={error} /></AdminLayout>

  return (
    <AdminLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/trainings')}>Назад к обучениям</Button>
        <Title level={4} style={{ margin: 0 }}>Редактор теста</Title>
        <Tag color={test.is_active ? 'success' : 'default'}>{test.is_active ? 'Активен' : 'Неактивен'}</Tag>
      </div>

      <Card title="Настройки теста" style={{ marginBottom: 24 }}>
        <Form form={settingsForm} layout="inline" onFinish={saveSettings}>
          <Form.Item name="title" label="Название" rules={[{ required: true }]} style={{ minWidth: 300 }}>
            <Input />
          </Form.Item>
          <Form.Item name="time_limit_minutes" label="Лимит (мин)" rules={[{ required: true }]}>
            <InputNumber min={5} max={180} />
          </Form.Item>
          <Form.Item name="deadline_days" label="Дней на прохождение" rules={[{ required: true }]}>
            <InputNumber min={1} max={30} />
          </Form.Item>
          <Form.Item name="passing_score" label="Проходной балл (%)" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} />
          </Form.Item>
          <Form.Item name="is_active" label="Активен" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>Сохранить</Button>
          </Form.Item>
        </Form>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Вопросы ({test.questions.length})</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={addQuestion}>Добавить вопрос</Button>
      </div>

      {test.questions.length === 0 && (
        <Alert type="info" message="Добавьте хотя бы один вопрос для активации теста" />
      )}

      {test.questions.map((q, qi) => (
        <QuestionCard key={q.id} q={q} qi={qi} onSave={(data) => saveQuestion(q, data)} onDelete={() => deleteQuestion(q.id)} />
      ))}
    </AdminLayout>
  )
}

function QuestionCard({ q, qi, onSave, onDelete }) {
  const [questionText, setQuestionText] = useState(q.question_text)
  const [questionType, setQuestionType] = useState(q.question_type)
  const [options, setOptions] = useState(q.answer_options.map((o) => ({ id: o.id, text: o.answer_text, is_correct: o.is_correct })))
  const [saving, setSaving] = useState(false)

  function toggleCorrect(idx) {
    setOptions((prev) => prev.map((o, i) => {
      if (questionType === 'single') return { ...o, is_correct: i === idx }
      return i === idx ? { ...o, is_correct: !o.is_correct } : o
    }))
  }

  function updateOptionText(idx, text) {
    setOptions((prev) => prev.map((o, i) => i === idx ? { ...o, text } : o))
  }

  function addOption() {
    setOptions((prev) => [...prev, { text: `Вариант ${prev.length + 1}`, is_correct: false }])
  }

  function removeOption(idx) {
    setOptions((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!questionText.trim()) { message.warning('Введите текст вопроса'); return }
    if (options.length < 2) { message.warning('Минимум 2 варианта ответа'); return }
    const hasCorrect = options.some((o) => o.is_correct)
    if (!hasCorrect) { message.warning('Укажите хотя бы один правильный ответ'); return }
    setSaving(true)
    await onSave({
      question_text: questionText,
      question_type: questionType,
      order_index: qi + 1,
      answer_options: options.map((o, i) => ({ answer_text: o.text, is_correct: o.is_correct, order_index: i + 1 })),
    })
    setSaving(false)
  }

  const LABELS = ['А', 'Б', 'В', 'Г', 'Д', 'Е']

  return (
    <Card
      title={
        <Space>
          <Text strong>Вопрос {qi + 1}</Text>
          <Tag color={questionType === 'single' ? 'blue' : 'purple'}>{questionType === 'single' ? 'Один ответ' : 'Несколько ответов'}</Tag>
        </Space>
      }
      style={{ marginBottom: 16 }}
      extra={
        <Space>
          <Button type="primary" size="small" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>Сохранить</Button>
          <Popconfirm title="Удалить вопрос?" onConfirm={onDelete} okText="Да" cancelText="Нет">
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <div>
          <Text strong>Текст вопроса:</Text>
          <Input.TextArea
            rows={2}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            style={{ marginTop: 4 }}
          />
        </div>

        <div>
          <Text strong>Тип вопроса: </Text>
          <Select value={questionType} onChange={(v) => { setQuestionType(v); setOptions((o) => o.map((x) => ({ ...x, is_correct: false }))) }} style={{ width: 260 }}>
            <Select.Option value="single">Один правильный ответ (radio)</Select.Option>
            <Select.Option value="multiple">Несколько правильных ответов (checkbox)</Select.Option>
          </Select>
        </div>

        <div>
          <Text strong>Варианты ответов</Text>
          <Text type="secondary"> (отметьте правильные):</Text>
          <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
            {options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {questionType === 'single' ? (
                  <Radio checked={opt.is_correct} onChange={() => toggleCorrect(i)} />
                ) : (
                  <Checkbox checked={opt.is_correct} onChange={() => toggleCorrect(i)} />
                )}
                <Text style={{ width: 24, color: '#666' }}>{LABELS[i]}.</Text>
                <Input
                  value={opt.text}
                  onChange={(e) => updateOptionText(i, e.target.value)}
                  style={{ flex: 1, borderColor: opt.is_correct ? '#52c41a' : undefined, background: opt.is_correct ? '#f6ffed' : undefined }}
                />
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeOption(i)} disabled={options.length <= 2} />
              </div>
            ))}
            {options.length < 6 && (
              <Button size="small" icon={<PlusOutlined />} onClick={addOption}>Добавить вариант</Button>
            )}
          </Space>
        </div>
      </Space>
    </Card>
  )
}
