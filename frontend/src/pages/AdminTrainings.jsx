import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table, Button, Drawer, Form, Input, Select, DatePicker, InputNumber,
  Space, Tag, Popconfirm, message, Typography, Divider, List
} from 'antd'
import { PlusOutlined, EditOutlined, TeamOutlined, FileTextOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import AdminLayout from '../components/layout/AdminLayout'
import client from '../api/client'

const { Title, Text } = Typography

export default function AdminTrainings() {
  const navigate = useNavigate()
  const [trainings, setTrainings] = useState([])
  const [loading, setLoading] = useState(true)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingTraining, setEditingTraining] = useState(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const [empDrawerOpen, setEmpDrawerOpen] = useState(false)
  const [selectedTraining, setSelectedTraining] = useState(null)
  const [employees, setEmployees] = useState([])
  const [empForm] = Form.useForm()
  const [addingEmp, setAddingEmp] = useState(false)

  useEffect(() => { loadTrainings() }, [])

  async function loadTrainings() {
    const r = await client.get('/trainings')
    setTrainings(r.data)
    setLoading(false)
  }

  function openCreate() {
    setEditingTraining(null)
    form.resetFields()
    setDrawerOpen(true)
  }

  function openEdit(t) {
    setEditingTraining(t)
    form.setFieldsValue({ ...t, start_date: dayjs(t.start_date), end_date: dayjs(t.end_date) })
    setDrawerOpen(true)
  }

  async function saveTraining(values) {
    setSaving(true)
    const data = { ...values, start_date: values.start_date.format('YYYY-MM-DD'), end_date: values.end_date.format('YYYY-MM-DD') }
    try {
      if (editingTraining) {
        await client.put(`/trainings/${editingTraining.id}`, data)
        message.success('Обучение обновлено')
      } else {
        await client.post('/trainings', data)
        message.success('Обучение создано')
      }
      setDrawerOpen(false)
      loadTrainings()
    } catch (e) {
      message.error(e.response?.data?.detail || 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTraining(id) {
    try {
      await client.delete(`/trainings/${id}`)
      message.success('Обучение удалено')
      loadTrainings()
    } catch (e) {
      message.error(e.response?.data?.detail || 'Нельзя удалить обучение с результатами тестов')
    }
  }

  async function openEmployees(t) {
    setSelectedTraining(t)
    const r = await client.get(`/trainings/${t.id}/employees`)
    setEmployees(r.data)
    setEmpDrawerOpen(true)
  }

  async function addEmployee(values) {
    setAddingEmp(true)
    try {
      await client.post(`/trainings/${selectedTraining.id}/employees`, values)
      message.success('Сотрудник добавлен')
      empForm.resetFields()
      const r = await client.get(`/trainings/${selectedTraining.id}/employees`)
      setEmployees(r.data)
    } catch (e) {
      message.error(e.response?.data?.detail || 'Ошибка')
    } finally {
      setAddingEmp(false)
    }
  }

  async function removeEmployee(enrollmentId) {
    try {
      await client.delete(`/trainings/${selectedTraining.id}/employees/${enrollmentId}`)
      const r = await client.get(`/trainings/${selectedTraining.id}/employees`)
      setEmployees(r.data)
    } catch (e) {
      message.error(e.response?.data?.detail || 'Ошибка')
    }
  }

  function goToTest(t) {
    if (t.has_test) {
      client.get('/tests').then((r) => {
        const test = r.data.find((x) => x.training_id === t.id)
        if (test) navigate(`/admin/tests/${test.id}/edit`)
      })
    } else {
      navigate(`/admin/tests/create?training_id=${t.id}`)
    }
  }

  const columns = [
    { title: 'Название', dataIndex: 'title', ellipsis: true },
    {
      title: 'Тип', dataIndex: 'training_type', width: 110,
      render: (v) => <Tag color={v === 'external' ? 'blue' : 'geekblue'}>{v === 'external' ? 'Внешнее' : 'Внутреннее'}</Tag>,
    },
    { title: 'Период', render: (r) => `${r.start_date} – ${r.end_date}`, width: 200 },
    { title: 'Часов', dataIndex: 'duration_hours', width: 70 },
    { title: 'Участников', dataIndex: 'employees_count', width: 100 },
    {
      title: 'Тест', dataIndex: 'has_test', width: 80,
      render: (v) => <Tag color={v ? 'success' : 'default'}>{v ? 'Есть' : 'Нет'}</Tag>,
    },
    {
      title: 'Действия', width: 180,
      render: (_, t) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} title="Редактировать" onClick={() => openEdit(t)} />
          <Button size="small" icon={<TeamOutlined />} title="Участники" onClick={() => openEmployees(t)} />
          <Button size="small" icon={<FileTextOutlined />} title={t.has_test ? 'Редактировать тест' : 'Создать тест'} onClick={() => goToTest(t)} />
          <Popconfirm
            title="Удалить обучение?"
            description="Это действие необратимо."
            onConfirm={() => deleteTraining(t.id)}
            okText="Удалить" cancelText="Отмена" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} title="Удалить" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Обучения</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Добавить обучение</Button>
      </div>

      <Table columns={columns} dataSource={trainings} rowKey="id" loading={loading} />

      {/* Training form drawer */}
      <Drawer
        title={editingTraining ? 'Редактировать обучение' : 'Новое обучение'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
        footer={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Отмена</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>Сохранить</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={saveTraining}>
          <Form.Item name="title" label="Название обучения" rules={[{ required: true, message: 'Обязательное поле' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="provider" label="Организатор" rules={[{ required: true, message: 'Обязательное поле' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="training_type" label="Тип обучения" rules={[{ required: true, message: 'Обязательное поле' }]}>
            <Select>
              <Select.Option value="internal">Внутреннее</Select.Option>
              <Select.Option value="external">Внешнее</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="start_date" label="Дата начала" rules={[{ required: true, message: 'Обязательное поле' }]}>
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="end_date" label="Дата окончания" rules={[{ required: true, message: 'Обязательное поле' }]}>
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="duration_hours" label="Длительность (часов)" rules={[{ required: true, message: 'Обязательное поле' }]}>
            <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Employees drawer */}
      <Drawer
        title={`Участники — ${selectedTraining?.title}`}
        open={empDrawerOpen}
        onClose={() => setEmpDrawerOpen(false)}
        width={500}
      >
        <Title level={5}>Добавить сотрудника</Title>
        <Form form={empForm} layout="vertical" onFinish={addEmployee}>
          <Form.Item name="last_name" label="Фамилия" rules={[{ required: true, message: 'Обязательное поле' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="first_name" label="Имя" rules={[{ required: true, message: 'Обязательное поле' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="department" label="Подразделение" rules={[{ required: true, message: 'Обязательное поле' }]}>
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={addingEmp} icon={<PlusOutlined />}>Добавить</Button>
        </Form>

        <Divider />
        <Title level={5}>Текущие участники ({employees.length})</Title>
        <List
          dataSource={employees}
          renderItem={(emp) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="del"
                  title="Удалить сотрудника из обучения?"
                  onConfirm={() => removeEmployee(emp.enrollment_id)}
                  okText="Удалить" cancelText="Отмена" okButtonProps={{ danger: true }}
                >
                  <Button size="small" danger>Удалить</Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                title={`${emp.last_name} ${emp.first_name}`}
                description={
                  <Space split="|" size={4}>
                    <Text type="secondary">{emp.department}</Text>
                    <Text type="secondary">Дедлайн: {emp.deadline_date || '—'}</Text>
                    {emp.score != null && <Text type="secondary">Балл: {emp.score}%</Text>}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>
    </AdminLayout>
  )
}
