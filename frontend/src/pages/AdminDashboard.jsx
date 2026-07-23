import { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Select, Input, Button, Tag, Space, Typography, Spin, Statistic } from 'antd'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { DownloadOutlined } from '@ant-design/icons'
import AdminLayout from '../components/layout/AdminLayout'
import client from '../api/client'

const { Title } = Typography

const TRAINING_STATUS_LABELS = { completed: 'Завершено', in_progress: 'В процессе', not_started: 'Не началось' }
const TRAINING_STATUS_COLORS = { completed: 'success', in_progress: 'warning', not_started: 'default' }
const TEST_STATUS_LABELS = { passed: 'Пройден', failed: 'Не пройден', not_taken: 'Не проходил' }
const TEST_STATUS_COLORS = { passed: 'success', failed: 'error', not_taken: 'default' }
const DEADLINE_LABELS = { overdue: 'Просрочен', soon: 'Скоро', ok: 'В норме', no_deadline: '—' }
const DEADLINE_COLORS = { overdue: 'error', soon: 'warning', ok: 'success', no_deadline: 'default' }

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [tableData, setTableData] = useState({ rows: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [departments, setDepartments] = useState([])
  const [trainings, setTrainings] = useState([])
  const [filters, setFilters] = useState({ department: undefined, training_id: undefined, status: 'all', search: '', page: 1 })

  useEffect(() => {
    Promise.all([
      client.get('/dashboard/stats'),
      client.get('/departments'),
      client.get('/trainings'),
    ]).then(([s, d, t]) => {
      setStats(s.data)
      setDepartments(d.data)
      setTrainings(t.data)
      setLoading(false)
    })
    fetchTable({ page: 1 })
  }, [])

  function fetchTable(overrides = {}) {
    const f = { ...filters, ...overrides }
    setTableLoading(true)
    const params = { page: f.page, page_size: 20 }
    if (f.department) params.department = f.department
    if (f.training_id) params.training_id = f.training_id
    if (f.status && f.status !== 'all') params.status = f.status
    if (f.search) params.search = f.search
    client.get('/dashboard/table', { params }).then((r) => {
      setTableData(r.data)
      setTableLoading(false)
    })
  }

  function applyFilters() {
    const newFilters = { ...filters, page: 1 }
    setFilters(newFilters)
    fetchTable({ page: 1 })
  }

  async function exportCsv() {
    const params = {}
    if (filters.department) params.department = filters.department
    if (filters.training_id) params.training_id = filters.training_id
    if (filters.status && filters.status !== 'all') params.status = filters.status
    if (filters.search) params.search = filters.search
    const r = await client.get('/dashboard/export', { params, responseType: 'blob' })
    const url = URL.createObjectURL(r.data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    { title: '№', render: (_, __, i) => (filters.page - 1) * 20 + i + 1, width: 50 },
    { title: 'Фамилия', dataIndex: 'last_name', sorter: (a, b) => a.last_name.localeCompare(b.last_name) },
    { title: 'Имя', dataIndex: 'first_name' },
    { title: 'Подразделение', dataIndex: 'department', ellipsis: true },
    { title: 'Обучение', dataIndex: 'training_title', ellipsis: true },
    { title: 'Часов', dataIndex: 'duration_hours', width: 70 },
    { title: 'Период', render: (r) => `${r.start_date} – ${r.end_date}`, width: 190 },
    {
      title: 'Статус обучения', dataIndex: 'training_status', width: 130,
      render: (v) => <Tag color={TRAINING_STATUS_COLORS[v]}>{TRAINING_STATUS_LABELS[v]}</Tag>,
    },
    {
      title: 'Тест', dataIndex: 'test_ready', width: 70,
      render: (v) => <Tag color={v ? 'success' : 'default'}>{v ? 'Да' : 'Нет'}</Tag>,
    },
    {
      title: 'Результат теста', dataIndex: 'test_status', width: 130,
      render: (v) => <Tag color={TEST_STATUS_COLORS[v]}>{TEST_STATUS_LABELS[v]}</Tag>,
    },
    { title: 'Балл', dataIndex: 'score', render: (v) => v != null ? `${v}%` : '—', width: 65 },
    { title: 'Дедлайн', dataIndex: 'deadline_date', render: (v) => v || '—', width: 100 },
    {
      title: 'Статус дедлайна', dataIndex: 'deadline_status', width: 130,
      render: (v) => <Tag color={DEADLINE_COLORS[v]}>{DEADLINE_LABELS[v]}</Tag>,
    },
  ]

  const pieData = stats ? [
    { name: 'Прошли', value: stats.by_training.reduce((s, t) => s + t.total_passed, 0), color: '#52c41a' },
    { name: 'Не прошли', value: stats.by_training.reduce((s, t) => s + t.total_failed, 0), color: '#ff4d4f' },
    { name: 'Не проходили', value: stats.by_training.reduce((s, t) => s + t.total_not_taken, 0), color: '#8c8c8c' },
  ] : []

  const barData = stats ? stats.by_training.filter((t) => t.avg_score != null).map((t) => ({
    name: t.training_title.length > 22 ? t.training_title.slice(0, 22) + '…' : t.training_title,
    avg: t.avg_score,
    fill: t.avg_score >= (t.passing_score || 70) ? '#52c41a' : '#ff4d4f',
  })) : []

  return (
    <AdminLayout>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <>
          {/* KPI cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={12} md={6}>
              <Card><Statistic title="Всего обучений" value={stats.total_trainings} /></Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card><Statistic title="Всего участников" value={stats.total_enrollments} /></Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card><Statistic title="Средний балл" value={stats.avg_score} suffix="%" precision={1} /></Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card><Statistic title="Прошли тест" value={stats.pass_rate} suffix="%" precision={1} /></Card>
            </Col>
          </Row>

          {/* Charts */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={14}>
              <Card title="Средний балл по обучениям">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v) => [`${v}%`, 'Средний балл']} />
                    <Bar dataKey="avg" name="Средний балл" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="Охват тестированием">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* Table */}
          <Card
            title="Сводная таблица"
            extra={<Button icon={<DownloadOutlined />} onClick={exportCsv}>Экспорт CSV</Button>}
          >
            <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={6}>
                <Select
                  allowClear placeholder="Подразделение" style={{ width: '100%' }}
                  onChange={(v) => setFilters((f) => ({ ...f, department: v }))}
                  showSearch optionFilterProp="children"
                >
                  {departments.map((d) => <Select.Option key={d} value={d}>{d}</Select.Option>)}
                </Select>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  allowClear placeholder="Обучение" style={{ width: '100%' }}
                  onChange={(v) => setFilters((f) => ({ ...f, training_id: v }))}
                  showSearch optionFilterProp="children"
                >
                  {trainings.map((t) => <Select.Option key={t.id} value={t.id}>{t.title}</Select.Option>)}
                </Select>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Select
                  defaultValue="all" style={{ width: '100%' }}
                  onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
                >
                  <Select.Option value="all">Все статусы</Select.Option>
                  <Select.Option value="passed">Пройден</Select.Option>
                  <Select.Option value="failed">Не пройден</Select.Option>
                  <Select.Option value="not_taken">Не проходил</Select.Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={5}>
                <Input
                  placeholder="Поиск по ФИО"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  onPressEnter={applyFilters}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={12} md={3}>
                <Button type="primary" block onClick={applyFilters}>Применить</Button>
              </Col>
            </Row>

            <Table
              columns={columns}
              dataSource={tableData.rows}
              rowKey="enrollment_id"
              loading={tableLoading}
              size="small"
              scroll={{ x: 1300 }}
              pagination={{
                total: tableData.total,
                pageSize: 20,
                current: filters.page,
                onChange: (p) => { setFilters((f) => ({ ...f, page: p })); fetchTable({ page: p }) },
                showTotal: (t) => `Всего ${t} записей`,
                showSizeChanger: false,
              }}
            />
          </Card>
        </>
      )}
    </AdminLayout>
  )
}
