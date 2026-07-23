import { useState } from 'react'
import { Layout, Menu, Typography, Button } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { DashboardOutlined, BookOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import useAuthStore from '../../store/authStore'

const { Sider, Content, Header } = Layout
const { Text } = Typography

export default function AdminLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  function handleLogout() { logout(); navigate('/admin/login') }

  const menuItems = [
    { key: '/admin/dashboard', icon: <DashboardOutlined />, label: 'Дашборд' },
    { key: '/admin/trainings', icon: <BookOutlined />, label: 'Обучения' },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={220}
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
      >
        {!collapsed && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4 }}>
            <Text style={{ color: '#fff', fontWeight: 600, fontSize: 13, display: 'block' }}>АО НПО Ангстрем</Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Система учёта обучения</Text>
          </div>
        )}
        {collapsed && <div style={{ height: 57 }} />}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header style={{
          padding: '0 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Text style={{ fontSize: 13 }}>{user?.full_name}</Text>
            <Button icon={<LogoutOutlined />} size="small" onClick={handleLogout}>Выйти</Button>
          </div>
        </Header>

        <Content style={{ margin: '24px', minWidth: 0 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
