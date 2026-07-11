# 微积分

## 极限

### 重要极限
$$\lim_{x \to 0} \frac{\sin x}{x} = 1$$
$$\lim_{x \to \infty} \left(1 + \frac{1}{x}\right)^x = e$$
$$\lim_{x \to 0} (1 + x)^{\frac{1}{x}} = e$$

### 等价无穷小（$x \to 0$）
- $\sin x \sim x$
- $\tan x \sim x$
- $\ln(1+x) \sim x$
- $e^x - 1 \sim x$
- $1 - \cos x \sim \frac{x^2}{2}$
- $\arcsin x \sim x$

### 洛必达法则
若 $\lim \frac{f(x)}{g(x)}$ 为 $\frac{0}{0}$ 或 $\frac{\infty}{\infty}$ 型，且 $\lim \frac{f'(x)}{g'(x)}$ 存在，则：
$$\lim \frac{f(x)}{g(x)} = \lim \frac{f'(x)}{g'(x)}$$

## 导数

### 基本导数公式
- $(x^n)' = nx^{n-1}$
- $(\sin x)' = \cos x$
- $(\cos x)' = -\sin x$
- $(\tan x)' = \sec^2 x$
- $(e^x)' = e^x$
- $(\ln x)' = \frac{1}{x}$
- $(a^x)' = a^x \ln a$

### 求导法则
- 乘法：$(uv)' = u'v + uv'$
- 除法：$\left(\frac{u}{v}\right)' = \frac{u'v - uv'}{v^2}$
- 链式法则：$\frac{dy}{dx} = \frac{dy}{du} \cdot \frac{du}{dx}$

### 导数应用
- 切线方程：$y - y_0 = f'(x_0)(x - x_0)$
- 单调性：$f'(x) > 0$ 递增，$f'(x) < 0$ 递减
- 极值点：$f'(x) = 0$ 且 $f''(x) \neq 0$
- 拐点：$f''(x) = 0$ 且 $f'''(x) \neq 0$

## 积分

### 基本积分公式
- $\int x^n dx = \frac{x^{n+1}}{n+1} + C \quad (n \neq -1)$
- $\int \frac{1}{x} dx = \ln|x| + C$
- $\int e^x dx = e^x + C$
- $\int \sin x dx = -\cos x + C$
- $\int \cos x dx = \sin x + C$

### 定积分
牛顿-莱布尼茨公式：
$$\int_a^b f(x)dx = F(b) - F(a)$$

### 换元积分法
$$\int f(g(x))g'(x)dx = \int f(u) du \quad (u = g(x))$$

### 分部积分法
$$\int u dv = uv - \int v du$$

### 积分应用
- 面积：$S = \int_a^b |f(x) - g(x)|dx$
- 旋转体体积：$V = \pi \int_a^b [f(x)]^2 dx$
- 弧长：$l = \int_a^b \sqrt{1 + [f'(x)]^2} dx$
