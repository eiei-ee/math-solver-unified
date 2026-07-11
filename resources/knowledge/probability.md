# 概率论与统计

## 概率基础

### 古典概型
$$P(A) = \frac{A\text{包含的基本事件数}}{\text{基本事件总数}}$$

### 条件概率
$$P(B|A) = \frac{P(AB)}{P(A)}$$

### 全概率公式
若 $B_1, B_2, \ldots, B_n$ 为完备事件组，则：
$$P(A) = \sum_{i=1}^{n} P(B_i)P(A|B_i)$$

### 贝叶斯公式
$$P(B_i|A) = \frac{P(B_i)P(A|B_i)}{\sum_{j=1}^{n} P(B_j)P(A|B_j)}$$

### 事件独立性
$A$ 与 $B$ 独立 $\iff P(AB) = P(A)P(B)$

## 随机变量

### 期望
- 离散型：$E(X) = \sum x_i p_i$
- 连续型：$E(X) = \int_{-\infty}^{\infty} x f(x) dx$
- 线性性：$E(aX + b) = aE(X) + b$

### 方差
$$D(X) = E[(X - E(X))^2] = E(X^2) - [E(X)]^2$$
$$D(aX + b) = a^2 D(X)$$

### 常见分布

| 分布 | 记号 | 期望 | 方差 |
|------|------|------|------|
| 二项分布 | $B(n, p)$ | $np$ | $np(1-p)$ |
| 泊松分布 | $P(\lambda)$ | $\lambda$ | $\lambda$ |
| 均匀分布 | $U[a, b]$ | $\frac{a+b}{2}$ | $\frac{(b-a)^2}{12}$ |
| 指数分布 | $E(\lambda)$ | $\frac{1}{\lambda}$ | $\frac{1}{\lambda^2}$ |
| 正态分布 | $N(\mu, \sigma^2)$ | $\mu$ | $\sigma^2$ |

### 正态分布标准化
若 $X \sim N(\mu, \sigma^2)$，则 $Z = \frac{X-\mu}{\sigma} \sim N(0, 1)$

## 统计基础

### 样本均值与方差
$$\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i$$
$$s^2 = \frac{1}{n-1}\sum_{i=1}^{n} (x_i - \bar{x})^2$$

### 协方差与相关系数
- $\text{Cov}(X, Y) = E(XY) - E(X)E(Y)$
- $\rho_{XY} = \frac{\text{Cov}(X, Y)}{\sqrt{D(X)D(Y)}}$
