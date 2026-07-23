import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Progress, Radio, Checkbox, Typography, Space, Modal, Spin, Alert } from 'antd'
import { LeftOutlined, RightOutlined, CheckOutlined } from '@ant-design/icons'
import client from '../api/client'

const { Title, Text } = Typography
const LS_KEY = (id) => `test_answers_${id}`

export default function TakeTest() {
  const { testId } = useParams()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('instruction')
  const [testData, setTestData] = useState(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)

  useEffect(() => {
    client.get(`/employee/tests/${testId}/start`)
      .then((r) => {
        setTestData(r.data)
        setSecondsLeft(r.data.time_limit_minutes * 60)
        const saved = localStorage.getItem(LS_KEY(r.data.attempt_id))
        if (saved) setAnswers(JSON.parse(saved))
        setLoading(false)
      })
      .catch((e) => {
        if (e.response?.status === 409) navigate(`/employee/tests/${testId}/result`)
        else { setError(e.response?.data?.detail || 'Ошибка'); setLoading(false) }
      })
  }, [testId, navigate])

  const submitTest = useCallback(async () => {
    if (!testData) return
    clearInterval(timerRef.current)
    setPhase('submitting')
    const answerList = Object.entries(answers).map(([qId, optIds]) => ({
      question_id: parseInt(qId),
      selected_option_ids: optIds,
    }))
    try {
      await client.post(`/employee/tests/${testId}/submit`, {
        attempt_id: testData.attempt_id,
        answers: answerList,
      })
      localStorage.removeItem(LS_KEY(testData.attempt_id))
      navigate(`/employee/tests/${testId}/result`)
    } catch (e) {
      setError(e.response?.data?.detail || 'Ошибка при отправке')
      setPhase('taking')
    }
  }, [testData, answers, testId, navigate])

  useEffect(() => {
    if (phase !== 'taking') return
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          Modal.warning({
            title: 'Время истекло',
            content: 'Тест будет завершён автоматически.',
            onOk: submitTest,
          })
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, submitTest])

  function saveAnswer(questionId, optionId, type) {
    setAnswers((prev) => {
      const updated = { ...prev }
      if (type === 'single') {
        updated[questionId] = [optionId]
      } else {
        const cur = updated[questionId] || []
        updated[questionId] = cur.includes(optionId)
          ? cur.filter((x) => x !== optionId)
          : [...cur, optionId]
      }
      localStorage.setItem(LS_KEY(testData.attempt_id), JSON.stringify(updated))
      return updated
    })
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 80 }}><Spin size="large" /></div>
  if (error) return <div style={{ maxWidth: 500, margin: '80px auto', padding: 24 }}><Alert type="error" message={error} showIcon /></div>
  if (!testData) return null

  const questions = testData.questions
  const q = questions[currentIdx]
  const minutes = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const isAlmostOut = secondsLeft < 300
  const timerColor = isAlmostOut ? '#cf1322' : undefined
  const LABELS = ['A', 'Б', 'В', 'Г', 'Д', 'Е']

  if (phase === 'instruction') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ maxWidth: 480, width: '100%' }}>
          <Title level={4} style={{ marginBottom: 20 }}>{testData.test_title}</Title>
          <Space direction="vertical" size={8} style={{ marginBottom: 24, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">Вопросов</Text>
              <Text strong>{questions.length}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">Ограничение времени</Text>
              <Text strong>{testData.time_limit_minutes} мин.</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">Проходной балл</Text>
              <Text strong>{testData.passing_score}%</Text>
            </div>
          </Space>
          <Alert type="warning" message="Тест можно пройти только один раз. После старта таймер не останавливается." style={{ marginBottom: 20 }} showIcon />
          <Button type="primary" block size="large" onClick={() => setPhase('taking')}>Начать тест</Button>
        </Card>
      </div>
    )
  }

  if (phase === 'submitting') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 }}>
        <Spin size="large" />
        <Text type="secondary">Отправка результатов...</Text>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 16px', background: 'inherit' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text type="secondary">Вопрос {currentIdx + 1} из {questions.length}</Text>
          <Text style={{ fontSize: 16, fontWeight: 600, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>
            {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </Text>
        </div>
        <Progress percent={Math.round(((currentIdx + 1) / questions.length) * 100)} showInfo={false} style={{ marginBottom: 20 }} />

        <Card>
          <Title level={5} style={{ marginTop: 0 }}>{currentIdx + 1}. {q.question_text}</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {q.question_type === 'single' ? 'Выберите один вариант ответа' : 'Выберите все подходящие варианты'}
          </Text>

          <Space direction="vertical" style={{ width: '100%' }}>
            {q.answer_options.map((opt, oi) => {
              const selected = (answers[q.id] || []).includes(opt.id)
              return (
                <Card
                  key={opt.id}
                  size="small"
                  style={{ cursor: 'pointer', borderColor: selected ? '#1a56db' : undefined, transition: 'border-color 0.15s' }}
                  onClick={() => saveAnswer(q.id, opt.id, q.question_type)}
                >
                  <Space>
                    {q.question_type === 'single'
                      ? <Radio checked={selected} onChange={() => {}} />
                      : <Checkbox checked={selected} onChange={() => {}} />}
                    <Text><Text type="secondary">{LABELS[oi]}.</Text> {opt.answer_text}</Text>
                  </Space>
                </Card>
              )
            })}
          </Space>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <Button
            icon={<LeftOutlined />}
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => i - 1)}
          >
            Назад
          </Button>
          {currentIdx < questions.length - 1 ? (
            <Button type="primary" onClick={() => setCurrentIdx((i) => i + 1)} iconPosition="end" icon={<RightOutlined />}>
              Далее
            </Button>
          ) : (
            <Button type="primary" icon={<CheckOutlined />} onClick={submitTest}>
              Завершить тест
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
